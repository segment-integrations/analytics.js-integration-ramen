'use strict';
var Analytics = require('analytics.js-core').constructor;
var integration = require('analytics.js-integration');
var sandbox = require('clear-env');
var tester = require('analytics.js-integration-tester');
var Ramen = require('../lib/');

describe('Ramen', function() {
  var analytics;
  var ramen;
  var options = {
    organization_id: '6389149'
  };

  beforeEach(function() {
    analytics = new Analytics();
    ramen = new Ramen(options);
    analytics.use(Ramen);
    analytics.use(tester);
    analytics.add(ramen);
  });

  afterEach(function() {
    analytics.restore();
    analytics.reset();
    ramen.reset();
    sandbox();
  });

  it('should have the right settings', function() {
    analytics.compare(Ramen, integration('Ramen')
      .global('Ramen')
      .global('ramenSettings')
      .option('organization_id', '')
      .tag('<script src="//cdn.ramen.is/assets/ramen.js">'));
  });

  describe('before loading', function() {
    beforeEach(function() {
      analytics.stub(ramen, 'load');
    });

    describe('#initialize', function() {
      it('should not create window.Ramen', function() {
        analytics.assert(!window.ramenSettings);
        analytics.assert(!window.Ramen);
        analytics.initialize();
        analytics.page();
        analytics.assert(!window.ramenSettings);
        analytics.assert(!window.Ramen);
      });

      it('should call #load', function() {
        analytics.initialize();
        analytics.page();
        analytics.called(ramen.load);
      });
    });
  });

  describe('loading', function() {
    it('should load', function(done) {
      analytics.load(ramen, done);
    });
  });

  describe('after loading', function() {
    beforeEach(function(done) {
      analytics.once('ready', done);
      analytics.initialize();
    });

    describe('#page', function() {
      beforeEach(function() {
        analytics.stub(window.Ramen, 'go');
      });

      it('should not call Ramen.go', function() {
        analytics.page();
        analytics.didNotCall(window.Ramen.go);
      });

      it('should call Ramen.go', function() {
        analytics.identify('12345', { email: 'ryan@ramen.is' });
        analytics.page();
        analytics.called(window.Ramen.go);
      });
    });

    describe('#group', function() {
      beforeEach(function() {
        analytics.stub(window.Ramen, 'go');
      });

      it('should not call Ramen.go before #identify', function() {
        analytics.group('id');
        analytics.assert(!window.ramenSettings);
        analytics.didNotCall(window.Ramen.go);
      });

      it('should set company ID & call Ramen.go() after #identify', function() {
        analytics.identify('1234', { email: 'ryan@ramen.is' });
        analytics.group('id');
        analytics.assert(window.ramenSettings.company.id === 'id');
        analytics.called(window.Ramen.go);
      });

      it('should set company traits & call Ramen.go()', function() {
        analytics.identify('1234567890', { email: 'ryan@ramen.is' });
        analytics.group('id', {
          createdAt: '2009-02-13T23:31:30.000Z',
          name: 'Pied Piper',
          url: 'http://piedpiper.com'
        });

        analytics.assert(window.ramenSettings.company.id === 'id');
        analytics.assert(window.ramenSettings.company.name === 'Pied Piper');
        analytics.assert(window.ramenSettings.company.url === 'http://piedpiper.com');
        analytics.assert(window.ramenSettings.company.created_at === 1234567890);
        analytics.called(window.Ramen.go);
      });
    });

    describe('#track', function() {
      beforeEach(function() {
        analytics.stub(window.Ramen.Api, 'track_named');
      });

      it('should not call Ramen.Api.track_named before #identify', function() {
        analytics.track('New signup');
        analytics.didNotCall(window.Ramen.Api.track_named);
      });

      it('should call Ramen.Api.track_named when #track is called', function() {
        analytics.identify('12345', { email: 'ryan@ramen.is' });
        analytics.track('New signup');
        analytics.called(window.Ramen.Api.track_named, 'New signup');
      });
    });

    describe('#identify', function() {
      beforeEach(function() {
        analytics.stub(window.Ramen, 'go');
      });

      it('should not call Ramen.go if only id is passed', function() {
        analytics.identify('id');
        analytics.assert(!window.ramenSettings);
        analytics.didNotCall(window.Ramen.go);

        analytics.identify('id');
        analytics.assert(!window.ramenSettings);
        analytics.didNotCall(window.Ramen.go);
      });

      it('should call Ramen.go and set correct attributes if just email passed', function() {
        var email = 'email@example.com';
        analytics.identify('id', { email: email });
        analytics.assert(window.ramenSettings.organization_id === '6389149');
        analytics.assert(window.ramenSettings.user.id === 'id');
        analytics.assert(window.ramenSettings.user.name === email);
        analytics.assert(window.ramenSettings.user.email === email);
        analytics.called(window.Ramen.go);
      });

      it('should call Ramen.go and set correct attributes if email & name passed', function() {
        var email = 'email@example.com';
        var name = 'ryan+segment@ramen.is';
        analytics.identify('id', { email: email, name: name });
        analytics.assert(window.ramenSettings.organization_id === '6389149');
        analytics.assert(window.ramenSettings.user.id === 'id');
        analytics.assert(window.ramenSettings.user.name === name);
        analytics.assert(window.ramenSettings.user.email === email);
        analytics.called(window.Ramen.go);
      });

      it('should pass along company traits', function() {
        var email = 'email@example.com';
        var name = 'ryan+segment@ramen.is';
        var company = {
          name: 'Pied Piper, Inc.',
          url: 'http://piedpiper.com',
          id: '987',
          createdAt: '2009-02-13T23:31:30.000Z',
          is_friend: true,
          used_coupon_at: 1234567890
        };

        analytics.identify('19', { email: email, name: name, company: company });

        var rs_company = window.ramenSettings.company;
        analytics.assert(rs_company.name === 'Pied Piper, Inc.');
        analytics.assert(rs_company.url === 'http://piedpiper.com');
        analytics.assert(rs_company.id === '987');

        var traits = window.ramenSettings.company.traits;
        analytics.assert(traits.is_friend === true);
        analytics.assert(traits.used_coupon_at === 1234567890);
        analytics.assert(traits.createdAt === 1234567890);
        analytics.assert(traits.name === undefined);
      });

      it('should pass other traits', function() {
        var email = 'email@example.com';
        var name = 'ryan+segment@ramen.is';
        analytics.identify('id', {
          email: email,
          name: name,
          age: 32,
          score: 43.1,
          color: 'green',
          is_friend: true,
          became_maven_at: 1234567890,
          first_purchase_at: '2009-02-13T23:31:31.000Z',
          lastPurchaseAt: '2009-02-13T23:31:32.000Z'
        });
        analytics.assert(window.ramenSettings.organization_id === '6389149');
        analytics.assert(window.ramenSettings.user.id === 'id');
        analytics.assert(window.ramenSettings.user.name === name);
        analytics.assert(window.ramenSettings.user.email === email);

        var traits = window.ramenSettings.user.traits;
        analytics.assert(traits.age === 32);
        analytics.assert(traits.score === 43.1);
        analytics.assert(traits.color === 'green');
        analytics.assert(traits.is_friend === true);
        analytics.assert(traits.became_maven_at === 1234567890);
        analytics.assert(traits.first_purchase_at === 1234567891);
        analytics.assert(traits.lastPurchaseAt === 1234567892);
        analytics.assert(traits.email === undefined);

        analytics.called(window.Ramen.go);
      });

      it('should pass along integration options', function() {
        var email = 'email@example.com';
        var name = 'ryan+segment@ramen.is';
        var auth_hash = 'authy_hasy';
        var auth_hash_timestamp = new Date() / 1000;
        var custom_links = [{ href: 'https://ramen.is/support', title: 'Hello' }];
        var labels = ['use', 'ramen!'];
        var environment = 'staging';
        var logged_in_url = 'https://align.ramen.is/manage';
        var unknown_future_opt = '11';
        var unknown_future_user_opt = 'user 11';

        analytics.identify('id', { email: email, name: name },
          {
            integrations: {
              Ramen: {
                unknown_future_opt: unknown_future_opt,
                environment: environment,
                auth_hash_timestamp: auth_hash_timestamp,
                auth_hash: auth_hash,
                custom_links: custom_links,
                user: {
                  unknown_future_user_opt: unknown_future_user_opt,
                  labels: labels,
                  logged_in_url: logged_in_url
                }
              }
            }
          }
        );

        analytics.assert(window.ramenSettings.environment === environment);
        analytics.assert(window.ramenSettings.disable_location_watch === true);
        analytics.assert(window.ramenSettings._partner === 'segment.com');
        analytics.assert(window.ramenSettings.auth_hash === auth_hash);
        analytics.assert(window.ramenSettings.unknown_future_opt === unknown_future_opt);
        analytics.assert(window.ramenSettings.timestamp === auth_hash_timestamp);
        analytics.assert(window.ramenSettings.user.unknown_future_user_opt === unknown_future_user_opt);
        analytics.assert(window.ramenSettings.user.labels.length === 2);
        analytics.assert(window.ramenSettings.user.logged_in_url === logged_in_url);
        analytics.assert(window.ramenSettings.custom_links[0].title === 'Hello');
      });
    });
  });
});
