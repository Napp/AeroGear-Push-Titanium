/**
 * AeroGear Titanium Library
 * Module to register iOS or Android device for AeroGear Unified Push
 * @version 1.1.0
 * Copyright Napp A/S
 * www.napp.dk
 *
 * Docs: https://aerogear.org/docs/specs/aerogear-unifiedpush-rest/index.html
 *
 * Inspiration: https://github.com/HazemKhaled/TiPushNotification
 */
var TAG = "[AeroPush] ";

// get underscore
var _ = require('alloy/underscore')._;

var logger = ENV_PROD ? function() {} : function(message, data) {
	Ti.API.info(message);
	data && Ti.API.info(typeof data === 'object' ? JSON.stringify(data, null, '\t') : data);
};

if (OS_ANDROID) {
	var GCM = require("org.jboss.aerogear.push");
}

function TiPush(e) {
	this.pushServerURL = e.pushServerURL;
	this.token = '';

	if (OS_ANDROID) {
		this.variantID = e.android.variantID;
		this.variantSecret = e.android.variantSecret;
		this.senderId = e.android.senderID;
	} else if (OS_IOS) {
		this.variantID = e.ios.variantID;
		this.variantSecret = e.ios.variantSecret;
		this.senderId = null;
	}

	this.os = (OS_ANDROID) ? 'Android' : 'iPhone OS';
}

TiPush.prototype.registerDevice = function(_prams) {
	var that = this,
		token = '',
		onReceive = _prams.onReceive,
		onStart = _prams.onStart || _prams.onReceive,
		onResume = _prams.onResume || _prams.onReceive,
		onTokenSuccess = _prams.onTokenSuccess,
		extraOptions = _prams.extraOptions || {},
		pnOptions = _prams.pnOptions || {};

	function deviceTokenSuccess(e) {
		if (OS_IOS) {
			Ti.API.debug(TAG + 'Device Token:', e.deviceToken);
			token = e.deviceToken;
			that.token = token;
	
			subscribePushServer(extraOptions, that);
		}

		onTokenSuccess && onTokenSuccess(e);
	}

	function deviceTokenError(e) {
		Ti.API.error(TAG + 'deviceTokenError Error:', e.error);
	}

	function receivePush(e) {
		if (OS_IOS) {
			// Reset badge
			Titanium.UI.iPhone.appBadge = null;
            var message = e.data.aps,
                alert = message.alert;
            message.payload = e.data;    
            delete message.payload.aps;
            
            if (alert.hasOwnProperty('body')) {
                message.alert = alert.body;
                message['alert-extra'] = alert;
            }
            e = message;
		}

		onReceive(e);
	}

	if (OS_ANDROID) {
		GCM.registerPush({
			categories: extraOptions.categories,
			alias: extraOptions.alias,
			senderID: that.senderId,
			variantID : that.variantID,
			variantSecret : that.variantSecret,
			pushServerURL: that.pushServerURL,
			success: deviceTokenSuccess,
			error: deviceTokenError,
			onNotification: receivePush
		});


	} else if (OS_IOS) {
		// Check if the device is running iOS 8 or later
		if (parseInt(Ti.Platform.version.split(".")[0], 10) >= 8) {
			function registerForPush() {
				Ti.Network.registerForPushNotifications({
					success: deviceTokenSuccess,
					error: deviceTokenError,
					callback: receivePush
				});
				// Remove event listener once registered for push notifications
				Ti.App.iOS.removeEventListener('usernotificationsettings', registerForPush);
			}

			// Wait for user settings to be registered before registering for push notifications
			Ti.App.iOS.addEventListener('usernotificationsettings', registerForPush);

			// Register notification types to use
			Ti.App.iOS.registerUserNotificationSettings({
				types: pnOptions.types || [Ti.App.iOS.USER_NOTIFICATION_TYPE_ALERT, Ti.App.iOS.USER_NOTIFICATION_TYPE_SOUND, Ti.App.iOS.USER_NOTIFICATION_TYPE_BADGE],
				categories: pnOptions.categories
			});

		} else {
			// For iOS 7 and earlier
			Ti.Network.registerForPushNotifications({
				// Specifies which notifications to receive
				types: pnOptions.types,
				success: deviceTokenSuccess,
				error: deviceTokenError,
				callback: receivePush
			});
		}

	} else {
		Ti.API.warn(TAG + " Push notification not implemented yet for", Ti.Platform.osname);
	}
};

TiPush.prototype.getToken = function() {
	return this.token;
};

TiPush.prototype.unregisterDevice = function(deviceToken) {
	var that = this;

	return httpRequest({
		settings: {
			method: "DELETE"
		},
		url: that.pushServerURL + "rest/registry/device/" + deviceToken,
		headers: {
			"Content-Type": "application/json",
			"Accept": "application/json",
			"Authorization": "Basic " + encodeWithBase64(that.variantID + ":" + that.variantSecret)
		},
		success: function(response) {
			Ti.API.debug(TAG + "unregisterWithPushServer success");
		},
		error: function(response) {
			Ti.API.error(TAG + "unregisterWithPushServer success");
		}
	});
};

/**
 * Subscribe or unsubscribe from a category
 */
TiPush.prototype.subscribeDevice = function(dataObject, onSuccess, onError) {
	var that = this;
	subscribePushServer(dataObject, that, onSuccess, onError);
};

/**
 * Track Push Open Event
 */
TiPush.prototype.trackPushOpenEvent = function(pushId) {
	var that = this;
	pushOpenEventTracking(pushId, that);
};

/**
 * init
 */
exports.init = function(params) {
	return new TiPush(params);
};



//
// HELPERS
//

function encodeWithBase64(str) {
	// Base64 issue: https://jira.appcelerator.org/browse/TIMOB-9111
	return String(Ti.Utils.base64encode(str)).replace(/(\r\n|\n|\r)/gm, "");
}

function httpRequest(args) {

	// input settings
	var settings = args.settings || {};

	// default settings
	var defaultSettings = {
		timeout: 10000,
		cache: false,
		method: "GET"
	};
	// overrule the default settings with the inputs
	_.defaults(settings, defaultSettings);

	//logger(TAG + "httpRequest args: ", args);

	// create a http client
	var xhr = Ti.Network.createHTTPClient(settings);

	xhr.open(settings.method, args.url);

	xhr.onload = function() {
		//logger(TAG + " response: ", this.responseText);
		_.isFunction(args.success) && args.success(this.responseText);
	};

	xhr.onerror = function(e) {
		Ti.API.error(TAG + "onerror code: " + e.code + " message: " + e.error + " response: ");
		Ti.API.error(this.responseText);

		// add the response
		e.response = this.responseText;
		_.isFunction(args.error) && args.error(e);
	};

	// headers
	for (var header in args.headers) {
		xhr.setRequestHeader(header, args.headers[header]);
	}

	// lets go
	xhr.send(args.data);
};


function subscribePushServer(dataObject, that, onSuccess, onError) {
	// set the data object
	_.defaults(dataObject, {
		"deviceToken": that.token,
		"deviceType": OS_IOS ? "iPhone" : "Android",
		"operatingSystem": that.os,
		"osVersion": Ti.App.version
	});


	dataObject = JSON.stringify(dataObject);

	httpRequest({
		settings: {
			method: "POST"
		},
		data: dataObject,
		url: that.pushServerURL + "rest/registry/device",
		headers: {
			"Content-Type": "application/json",
			"Accept": "application/json",
			"Authorization": "Basic " + encodeWithBase64(that.variantID + ":" + that.variantSecret)
		},
		success: function(response) {
			logger(TAG + "subscribeDevice success");
			_.isFunction(onSuccess) && onSuccess(response);
		},
		error: function(response) {
			logger(TAG + "subscribeDevice ERROR Can't subscribe the device", response);
			_.isFunction(onError) && onError(response);
		}
	});
}

/**
 * Track the opening of push
 * @param {String} pushMessageId
 * @param {Class} TiPush
 */
function pushOpenEventTracking(pushMessageId, that) {
	httpRequest({
		settings: {
			method: "PUT"
		},
		url: that.pushServerURL + "rest/registry/device/pushMessage/" + pushMessageId,
		headers: {
			"Content-Type": "application/json",
			"Accept": "application/json",
			"Authorization": "Basic " + encodeWithBase64(that.variantID + ":" + that.variantSecret)
		},
		success: function(response) {
			Ti.API.debug(TAG + "pushOpenEventTracking success");
		},
		error: function(response) {
			Ti.API.error(TAG + "pushOpenEventTracking error");
		}
	});
}
