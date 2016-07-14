/**
 * GatherContent Importer - v3.0.0 - 2016-07-13
 * http://www.gathercontent.com
 *
 * Copyright (c) 2016 GatherContent
 * Licensed under the GPLv2 license.
 */

(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

module.exports = Backbone.Collection.extend({
	getById: function getById(id) {
		return this.find(function (model) {
			var modelId = model.get('id');
			return modelId === id || modelId && id && modelId == id;
		});
	}
});

},{}],2:[function(require,module,exports){
'use strict';

module.exports = function (app) {
	app.models = { base: require('./models/base.js') };
	app.collections = { base: require('./collections/base.js') };
	app.views = { base: require('./views/base.js') };
};

},{"./collections/base.js":1,"./models/base.js":3,"./views/base.js":6}],3:[function(require,module,exports){
"use strict";

module.exports = Backbone.Model.extend({
	sync: function sync() {
		return false;
	}
});

},{}],4:[function(require,module,exports){
'use strict';

module.exports = function (gc) {
	return Backbone.Model.extend({
		defaults: {
			id: 0,
			item: 0,
			itemName: 0,
			updated: '',
			current: true,
			editLink: '',
			mapping: 0,
			mappingName: 0,
			mappingLink: '',
			mappingStatus: '',
			mappingStatusId: '',
			status: {},
			checked: false,
			disabled: false,
			statuses: [],
			statusesChecked: false,
			statusSetting: {}
		},

		url: function url() {
			var url = window.ajaxurl + '?action=gc_fetch_js_post&id=' + this.get('id');
			if (this.get('uncached')) {
				this.set('uncached', false);
				url += '&flush_cache=force';
			}
			return url;
		},

		_get: function _get(value, attribute) {
			switch (attribute) {
				case 'disabled':
					value = !this.get('item') || !this.get('mapping');
					break;
				case 'mappingStatus':
					value = gc._statuses[value] ? gc._statuses[value] : '';
					break;
				case 'mappingStatusId':
					value = Backbone.Model.prototype.get.call(this, 'mappingStatus');
					break;
			}

			return value;
		},

		get: function get(attribute) {
			return this._get(Backbone.Model.prototype.get.call(this, attribute), attribute);
		},

		// hijack the toJSON method and overwrite the data that is sent back to the view.
		toJSON: function toJSON() {
			return _.mapObject(Backbone.Model.prototype.toJSON.call(this), _.bind(this._get, this));
		}

	});
};

},{}],5:[function(require,module,exports){
'use strict';

window.GatherContent = window.GatherContent || {};

(function (window, document, $, gc, undefined) {
	'use strict';

	gc.single = gc.single || {};
	var app = gc.single;

	// Initiate base objects.
	require('./initiate-objects.js')(app);

	/*
  * Posts
  */

	app.models.post = require('./models/post.js')(gc);
	app.views.statusSelect2 = require('./views/status-select2.js')(app);
	app.views.metabox = require('./views/metabox.js')(app, $, gc);

	app.init = function () {
		// Kick it off.
		app.metaboxView = new app.views.metabox({
			model: new app.models.post(gc._post)
		});
	};

	$(app.init);
})(window, document, jQuery, window.GatherContent);

},{"./initiate-objects.js":2,"./models/post.js":4,"./views/metabox.js":8,"./views/status-select2.js":9}],6:[function(require,module,exports){
'use strict';

module.exports = Backbone.View.extend({
	toggleExpanded: function toggleExpanded(evt) {
		this.model.set('expanded', !this.model.get('expanded'));
	},

	getRenderedModels: function getRenderedModels(View, models) {
		models = models || this.collection;
		var addedElements = document.createDocumentFragment();

		models.each(function (model) {
			var view = new View({ model: model }).render();
			addedElements.appendChild(view.el);
		});

		return addedElements;
	},

	render: function render() {
		this.$el.html(this.template(this.model.toJSON()));
		return this;
	},

	close: function close() {
		this.remove();
		this.unbind();
		if (this.onClose) {
			this.onClose();
		}
	}
});

},{}],7:[function(require,module,exports){
'use strict';

module.exports = function (app, $, gc) {
	var thisView;
	return app.views.statusSelect2.extend({
		className: 'misc-pub-section misc-pub-post-status',
		select2template: wp.template('gc-status-select2'),
		template: wp.template('gc-metabox-statuses'),
		isOpen: false,
		rendered: false,

		initialize: function initialize() {
			thisView = this;
			this.listenTo(this, 'render', this.render);
			this.listenTo(this, 'statusesOpen', this.statusesOpen);
			this.listenTo(this, 'statusesClose', this.statusesClose);
		},

		statusesOpen: function statusesOpen() {
			this.isOpen = true;
			if (!this.model.get('statusesChecked')) {
				this.asyncInit();
			}
			this.$('.edit-gc-status').addClass('hidden');
			this.$('#gc-post-status-select').slideDown('fast' /*, function() {
                                                     thisView.$( '#gc-set-status' ).focus();
                                                     }*/);
		},

		statusesClose: function statusesClose() {
			this.isOpen = false;
			this.$('.edit-gc-status').removeClass('hidden');
			this.$('#gc-post-status-select').slideUp('fast');
		},

		asyncInit: function asyncInit() {
			this.rendered = false;
			$.post(window.ajaxurl, {
				action: 'gc_get_post_statuses',
				postId: this.model.get('id'),
				flush_cache: !!gc.queryargs.flush_cache
			}, this.ajaxResponse.bind(this)).done(function () {
				thisView.firstToRender();
			}).fail(function () {
				thisView.model.set('statusesChecked', false);
			});

			this.model.set('statusesChecked', true);
		},

		ajaxResponse: function ajaxResponse(response) {
			if (!response.data || !response.success) {
				this.model.set('statusesChecked', false);
				return;
			}

			this.model.set('statusesChecked', true);
			this.model.set('statuses', response.data.statuses);

			if (this.model.get('statuses').length) {
				thisView.$('.gc-select2').each(function () {
					$(this).select2('destroy');
				});

				thisView.firstToRender();
			}
		},

		firstToRender: function firstToRender() {
			if (!thisView.rendered) {
				thisView.renderStatuses();
				thisView.rendered = true;
			}
		},

		renderStatuses: function renderStatuses() {
			var postId = this.model.get('id');
			this.$('#gc-status-selec2').html(this.select2template(this.model.toJSON()));
			if (this.model.get('statuses').length) {
				this.renderSelect2(this.$el);
			}
		},

		render: function render() {
			this.$el.html(this.template(this.model.toJSON()));
			if (this.model.get('statusesChecked')) {
				thisView.renderStatuses();
			}
			return this;
		}

	});
};

},{}],8:[function(require,module,exports){
'use strict';

module.exports = function (app, $, gc) {
	var thisView;
	var StatusesView = require('./../views/metabox-statuses.js')(app, $, gc);

	return app.views.base.extend({
		el: '#gc-related-data',
		template: wp.template('gc-metabox'),
		statusesView: null,
		timeoutID: null,
		events: {
			'click .edit-gc-status': 'editStatus',
			'click .cancel-gc-status': 'cancelEditStatus',
			'click .save-gc-status': 'saveStatus',
			'click #gc-pull': 'pull',
			'click #gc-push': 'push'
		},

		initialize: function initialize() {
			thisView = this;
			this.listenTo(this.model, 'change:status', this.renderStatusView);
			this.listenTo(this.model, 'change:mappingStatus', this.render);
			this.listenTo(this.model, 'render', this.render);

			this.statusesView = new StatusesView({
				model: this.model
			});

			this.render();
			this.$el.removeClass('no-js');

			this.refreshData();
		},

		refreshData: function refreshData() {
			// Trigger an un-cached update for the item data
			this.model.set('uncached', true);
			this.model.fetch().done(function (data) {
				console.warn('this.model', thisView.model.toJSON());
				if (!thisView.statusesView.isOpen) {
					thisView.render();
				}
			});
		},

		updateModel: function updateModel(data) {
			var id = this.model.get('id');
			if (id in data) {
				if (data[id].status) {
					this.model.set('status', data[id].status);
				}
				if (data[id].itemName) {
					this.model.set('itemName', data[id].itemName);
				}
				if (data[id].updated) {
					this.model.set('updated', data[id].updated);
				}
			}
		},

		editStatus: function editStatus(evt) {
			evt.preventDefault();
			this.statusesView.trigger('statusesOpen');
		},

		cancelEditStatus: function cancelEditStatus(evt) {
			evt.preventDefault();
			this.statusesView.trigger('statusesClose');
		},

		saveStatus: function saveStatus() {
			var newStatusId = this.$('.gc-default-mapping-select').val();
			var oldStatus = this.model.get('status');
			var oldStatusId = oldStatus && oldStatus.id ? oldStatus.id : false;
			var newStatus, statuses, fail, success;

			if (newStatusId === oldStatusId) {
				return this.statusesView.trigger('statusesClose');
			}

			statuses = this.model.get('statuses');
			newStatus = _.find(statuses, function (status) {
				return parseInt(newStatusId, 10) === parseInt(status.id, 10);
			});

			this.statusesView.trigger('statusesClose');
			this.model.set('status', newStatus);

			fail = function () {
				thisView.model.set('status', oldStatus);
			};

			success = function (response) {
				if (response.success) {
					this.refreshData();
				} else {
					fail();
				}
			};

			this.ajax({
				action: 'set_gc_status',
				status: newStatusId
			}, success).fail(fail);
		},

		pull: function pull() {
			if (window.confirm(gc._sure.pull)) {
				thisView.model.set('mappingStatus', 'starting');
				this.doSync('pull');
			}
		},

		push: function push() {
			if (window.confirm(gc._sure.push)) {
				thisView.model.set('mappingStatus', 'starting');
				this.doSync('push');
			}
		},

		syncFail: function syncFail(msg) {
			msg = msg || gc._errors.unknown;
			window.alert(msg);
			thisView.model.set('mappingStatus', 'failed');
			thisView.clearTimeout();
		},

		syncResponse: function syncResponse(response) {
			if (response.success && response.data.mappings) {
				var mappings = response.data.mappings;
				if (mappings.length && -1 !== _.indexOf(mappings, this.model.get('mapping'))) {

					this.model.set('mappingStatus', 'syncing');
					this.checkStatus(response.data.direction);
				} else {
					this.finishedSync(response.data.direction);
				}
			} else {
				this.syncFail(response.data);
			}
		},

		doSync: function doSync(direction, data) {
			this.ajax({
				action: 'gc_' + direction + '_items',
				// action : 'glsjlfjs',
				data: data || [this.model.toJSON()],
				nonce: gc._edit_nonce
			}, this.syncResponse).fail(function () {
				thisView.syncFail();
			});
		},

		finishedSync: function finishedSync(direction) {
			this.clearTimeout();
			this.model.set('mappingStatus', 'complete');
			if ('push' === direction) {
				this.refreshData();
			} else {
				window.location.href = window.location.href;
			}
		},

		checkStatus: function checkStatus(direction) {
			this.clearTimeout();
			this.timeoutID = window.setTimeout(function () {
				thisView.doSync(direction, { check: [thisView.model.get('mapping')] });
			}, 1000);
		},

		clearTimeout: function clearTimeout() {
			window.clearTimeout(this.timeoutID);
			this.timeoutID = null;
		},

		ajax: function ajax(args, successcb) {
			return $.post(window.ajaxurl, $.extend({
				action: '',
				post: this.model.toJSON(),
				nonce: gc.$id('gc-edit-nonce').val(),
				flush_cache: !!gc.queryargs.flush_cache
			}, args), successcb.bind(this));
		},

		render: function render() {
			this.$el.html(this.template(this.model.toJSON()));

			// This needs to happen after rendering.
			this.$('.misc-pub-section.gc-item-name').after(this.statusesView.render().el);

			return this;
		},

		renderStatusView: function renderStatusView() {
			this.statusesView.$el.replaceWith(this.statusesView.render().el);
		}

	});
};

},{"./../views/metabox-statuses.js":7}],9:[function(require,module,exports){
'use strict';

module.exports = function (app) {
	var thisView;
	return app.views.base.extend({
		select2ItemTemplate: wp.template('gc-select2-item'),
		width: '250px',

		renderSelect2: function renderSelect2($context) {
			var $selector = $context ? $context.find('.gc-select2') : this.$('.gc-select2');
			thisView = this;

			$selector.each(function () {
				var $this = jQuery(this);
				var data = $this.data();
				$this.select2(thisView.select2Args(data));
				var s2Data = $this.data('select2');

				// Add classes for styling.
				s2Data.$results.addClass('select2-' + data.column);
				s2Data.$container.addClass('select2-' + data.column);
			});

			return this;
		},

		select2Args: function select2Args(data) {
			var args = {
				width: thisView.width
			};

			args.templateResult = (function (status, showDesc) {
				var data = jQuery.extend(status, jQuery(status.element).data());
				data.description = false === showDesc ? false : data.description || '';
				return jQuery(thisView.select2ItemTemplate(status));
			}).bind(thisView);

			args.templateSelection = function (status) {
				return args.templateResult(status, false);
			};

			return args;
		}

	});
};

},{}]},{},[5]);
