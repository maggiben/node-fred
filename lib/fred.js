var request = require('request');
var Joi = require('joi');
var moment = require('moment');

var APITREE = [{
  'name': 'category',
  'path': '/category',
  'parameters': ['file_type', 'category_id'],
  'children': [{
    'name': 'children',
    'path': '/category/children',
    'parameters': ['file_type', 'category_id', 'realtime_start', 'realtime_end']
  }, {
    'name': 'related',
    'path': '/category/related',
    'parameters': ['file_type', 'category_id', 'realtime_start', 'realtime_end']
  }, {
    'name': 'series',
    'path': '/category/series',
    'parameters': ['file_type', 'category_id', 'realtime_start', 'realtime_end', 'limit', 'offset', 'order_by', 'sort_order', 'filter_variable', 'filter_value', 'tag_names', 'exclude_tag_names']
  }]
}, {
  'name': 'series',
  'path': '/series',
  'parameters': ['file_type', 'series_id', 'realtime_start', 'realtime_end'],
  'children': [{
    'name': 'observations',
    'path': '/series/observations',
    'parameters': ['file_type', 'series_id', 'realtime_start', 'realtime_end', 'limit', 'offset', 'sort_order', 'observation_start', 'observation_end', 'units', 'frequency', 'aggregation_method', 'output_type', 'vintage_dates']
  }, {
    'name': 'categories',
    'path': '/series/categories',
    'parameters': ['file_type', 'series_id', 'realtime_start', 'realtime_end']
  }, {
    'name': 'release',
    'path': '/series/release',
    'parameters': ['file_type', 'series_id', 'realtime_start', 'realtime_end']
  }, {
    'name': 'search',
    'path': '/series/search',
    'parameters': ['file_type', 'search_text', 'search_type', 'realtime_start', 'realtime_end', 'limit', 'offset', 'order_by', 'sort_order', 'filter_variable', 'filter_value', 'tag_names', 'exclude_tag_names'],
    'children': []
  }]
}, {
  'name': 'releases',
  'path': '/releases',
  'parameters': ['realtime_start', 'realtime_end', 'limit', 'offset', 'order_by', 'sort_order'],
  'children': [{
    'name': 'observations',
    'path': '/series/observations',
    'parameters': ['file_type', 'series_id', 'realtime_start', 'realtime_end', 'limit', 'offset', 'sort_order', 'observation_start', 'observation_end', 'units', 'frequency', 'aggregation_method', 'output_type', 'vintage_dates']
  }]
}];



var allParams = {
  'file_type': Joi.any().optional().default('xml').allow(['xml', 'json', 'txt', 'xls']),
  'series_id': Joi.string().required(),
  'category_id': Joi.number().integer().default(0).required(),
  'realtime_start': Joi.date().optional().default(moment().format('YYYY-MM-DD')).format('YYYY-MM-DD'),
  'realtime_end': Joi.date().optional().default(moment().format('YYYY-MM-DD')).format('YYYY-MM-DD'),
  'observation_start': Joi.date().optional().default(moment('1776-07-04', 'YYYY-MM-DD').format('YYYY-MM-DD')).format('YYYY-MM-DD'),
  'observation_end': Joi.date().optional().default(moment('9999-12-31', 'YYYY-MM-DD').format('YYYY-MM-DD')).format('YYYY-MM-DD'),
  'tag_names': Joi.string().optional(),
  'exclude_tag_names': Joi.string().optional(),
  'tag_group_id': Joi.any().optional().allow(['freq', 'gen', 'geo', 'geot', 'rls', 'seas', 'src']),
  'search_text': Joi.string().optional(),
  'search_type': Joi.any().optional().default('full_text').allow(['full_text', 'series_id']),
  'limit': Joi.number().integer().optional().default(100000).min(1).max(100000),
  'offset': Joi.number().integer().optional().min(0).default(0),
  'order_by': Joi.any().optional().default('series_count').allow(['series_count', 'popularity', 'created', 'name', 'group_id']),
  'sort_order': Joi.any().optional().default('asc').allow(['asc', 'desc']),
  'units': Joi.any().optional().default('lin').allow(['lin', 'chg', 'ch1', 'pch', 'pc1', 'pca', 'cch', 'cca', 'log']),
  'frequency': Joi.any().optional().allow(['d', 'w', 'bw', 'm', 'q', 'sa', 'a', 'wef', 'weth', 'wew', 'wetu', 'wem', 'wesu', 'wesa', 'bwew', 'bwem']),
  'aggregation_method': Joi.any().optional().default('asc').allow(['asc', 'desc']),
  'output_type': Joi.number().integer().optional().default(1).min(1).max(4),
  'vintage_dates': Joi.date().optional().format('YYYY-MM-DD'),
  'filter_variable': Joi.any().optional().allow(['frequency', 'units', 'seasonal_adjustment']),
  'filter_value': Joi.string().optional()
};

function validateParams(params) {
  var keys = {};
  params.forEach(function(param) {
    keys[param] = allParams[param];
  });
  return Joi.object().keys(keys);
}

var DEFAULT_FRED = {
  PROTOCOL: 'http://',
  HOST: 'api.stlouisfed.org',
  PATH: '/fred'
}

var Fred = function(apiKey) {
  if (!(this instanceof Fred)) {
    return new Fred(apiKey)
  }

  this._api = {
    protocol: DEFAULT_FRED.PROTOCOL,
    host: DEFAULT_FRED.HOST,
    path: DEFAULT_FRED.PATH,
    key: apiKey
  }

  APITREE.forEach((subject) => {
    this[subject.name] = Fred.prototype[subject.name] = function() {

    };
    subject.children.forEach((children) => {
      this[subject.name][children.name] = Fred.prototype.callMethod.bind(this, children)
    });
  })
}

Fred.prototype.callMethod = function(method, options, done) {

  Joi.validate(options, validateParams(method.parameters), (err, value) => {
    if (err) return done(err)
    options['api_key'] = this._api.key;
    request({
      uri: 'http://' + this._api.host + this._api.path + method.path,
      qs: options,
      json: true
    }, function(err, res, body) {
      if (err) return done(err)
      if (res.statusCode != 200) return done(new Error(body.error_message))
      done(null, body)
    });
  });
}

module.exports = Fred