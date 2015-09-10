'use strict';

/**
 * Module dependencies.
 */

var integration = require('analytics.js-integration');
var convertDates = require('convert-dates');
var defaults = require('defaults');
var is = require('is');
var del = require('obj-case').del;
var extend = require('extend');

/**
 * Expose `Ramen` integration.
 */

var Ramen = module.exports = integration('Ramen')
  .global('Ramen')
  .global('ramenSettings')
  .option('organization_id', '')
  .tag('<script src="//cdn.ramen.is/assets/ramen.js">');

/**
 * Initialize.
 *
 * @api public
 */

Ramen.prototype.initialize = function() {
  var self = this;

  window.ramenSettings = {
    _partner: 'segment.com',
    disable_location_watch: true
  };

  this.load(self.ready);
};

/**
 * Loaded?
 *
 * @api private
 * @return {boolean}
 */

Ramen.prototype.loaded = function() {
  return is.object(window.Ramen);
};

/**
 * Identify.
 *
 * @api public
 * @param {Identify} identify
 */

Ramen.prototype.identify = function(identify) {
  privateGo({ integration: this, identify: identify });
};

Ramen.prototype.group = function(group) {
  privateGo({ integration: this, group: group });
};

Ramen.prototype.page = function(page) {
  privateGo({ integration: this, page: page });
};

Ramen.prototype.track = function(track) {
  privateGo({ integration: this, track: track });
};

function privateGo(options) {
  var integration = options.integration;
  var ramenSettings = {};
  var property;
  var identify;
  var traits;
  var opts;
  var user_opts;
  var created;
  var name;
  var id;
  var email;
  var group;

  if (options.identify) {
    identify = options.identify;
    traits = identify.traits();
    opts = identify.options(integration.name);
    user_opts = opts.user;
    created = identify.created();
    name = identify.name();
    id = identify.uid();
    email = identify.email();
    group = integration.analytics.group();
  } else {
    traits = {};
    group = {};
    opts = {};
  }

  email = email || integration.analytics.user().traits().email;
  id = id || integration.analytics.user().id();

  // We need email addresses
  if (!email) {
    return;
  }

  // Send a name in as well
  if (!name) name = email;

  del(traits, 'email');
  del(traits, 'name');

  if (traits.company !== null && !is.object(traits.company)) {
    delete traits.company;
  }

  if (traits.company && typeof group.traits === 'function') {
    defaults(traits.company, group.traits());
  }

  ramenSettings.organization_id = integration.options.organization_id;
  ramenSettings.user = {
    name: name,
    id: id,
    email: email
  };

  if (created) {
    ramenSettings.user.created_at = Math.round(created / 1000);
    del(traits, 'created_at');
    del(traits, 'created');
    del(traits, 'createdAt');
  }

  // Iterate through company traits and load them on ramenSettings.company
  if (traits.company) {
    var tc = traits.company;
    ramenSettings.company = {
      name: tc.name,
      url: tc.url,
      id: tc.id,
      value: tc.value,
      labels: tc.labels,
      traits: {}
    };

    del(tc, 'name');
    del(tc, 'url');
    del(tc, 'id');
    del(tc, 'value');
    del(tc, 'labels');

    tc = convertDates(tc, function(date) { return Math.floor(date / 1000); });
    for (property in tc) {
      if (tc.hasOwnProperty(property)) {
        ramenSettings.company.traits[property] = tc[property];
      }
    }

    del(traits, 'company');
  }

  // Iterate through user options and load them on ramenSettings.user
  if (user_opts) {
    for (property in user_opts) {
      if (user_opts.hasOwnProperty(property)) {
        ramenSettings.user[property] = user_opts[property];
      }
    }

    // Delete user from opts so we don't override in the next loop
    del(opts, 'user');
  }

  traits = convertDates(traits, function(date) { return Math.floor(date / 1000); });

  for (property in traits) {
    if (traits.hasOwnProperty(property)) {
      ramenSettings.user.traits = ramenSettings.user.traits || {};
      ramenSettings.user.traits[property] = traits[property];
    }
  }

  // Iterate through options and load them on ramenSettings
  for (property in opts) {
    if (opts.hasOwnProperty(property)) {
      ramenSettings[property] = opts[property];
    }
  }

  if (ramenSettings.auth_hash_timestamp) {
    ramenSettings.timestamp = ramenSettings.auth_hash_timestamp;
    del(ramenSettings, 'auth_hash_timestamp');
  }

  if (options.group) {
    group = options.group;
    var props = group.properties();
    props.created_at = group.created();
    if (props.created_at) {
      props.created_at = Math.round(props.created_at / 1000);
    }
    del(props, 'created');
    del(props, 'createdAt');
    id = group.groupId();
    if (id) props.id = id;

    // Iterate through properties and send them along to Ramen through ramenSettings
    ramenSettings.company = {};
    for (property in props) {
      if (props.hasOwnProperty(property)) {
        ramenSettings.company[property] = props[property];
      }
    }
  }

  // Expose ramenSettings so Ramen.go() can see it
  window.ramenSettings = extend(ramenSettings, window.ramenSettings || {});

  // Ramen.go() will figure things out if called multiple times
  window.Ramen.go();

  if (options.track) {
    window.Ramen.Api.track_named(options.track.event());
  }
}
