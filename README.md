# AeroGear Push - Appcelerator Titanium

This is a commonJS module for Appcelerator Titanium. 


The AeroGear UnifiedPush Server is a server that allows sending push notifications to different (mobile) platforms. Read more here: https://github.com/aerogear/aerogear-unifiedpush-server


## How to use

Notice: On Android we need a GCM native module. Please download and add `aerogear-titanium-push` to your project: https://github.com/aerogear/aerogear-titanium-push 


Add the following code to `alloy.js`. 


```javascript

// Napp AeroGear Push
var AeroGearPush = require('AeroGearPush').init({
	pushServerURL: "<pushServerURL e.g http(s)//host:port/context >",
    android: {
        senderID: "<senderID e.g Google Project ID only for android>",
        variantID: "<variantID e.g. 1234456-234320>",
        variantSecret: "<variantSecret e.g. 1234456-234320>"
    },
    ios: {
        variantID: "<variantID e.g. 1234456-234320>",
        variantSecret: "<variantSecret e.g. 1234456-234320>"
    }
});


// register this device
AeroGearPush.registerDevice({
    extraOptions: {
    	categories: ["banana", "apple"]
    },
    onReceive: function(event) {
    	// Called when a notification is received and the app is in the foreground 	
    	
        // Track Push Open
        var pushId = event.payload["aerogear-push-id"];
        AeroGearPush.trackPushOpenEvent(pushId);
    	
    	// delay the dialog message
    	setTimeout(function(){
	    	
		    var dialog = Ti.UI.createAlertDialog({
				title: L('New Notification'),
		        message: JSON.stringify(event),
		        buttonNames: [L('View'),L('Cancel')],
		        cancel: 1
		    });
		    dialog.addEventListener("click", function(event) {
		        dialog.hide();
		        if (event.index == 0) {
		            // Do stuff to view the notification
		        }
		    });
		    dialog.show();	
	    }, 1500);
	}
});


// Optional: subscribe to a new channel
AeroGearPush.registerDevice.subscribeDevice({
	categories: ["banana", "apple", "niceness"]
});

```

## Changelog

* 1.0.0
  * Initial version. 

## Author

**Mads Møller**  
web: http://www.napp.dk  
email: mm@napp.dk  
twitter: @nappdev  


## License

	MIT

    Copyright (c) 2010-2016 Mads Møller

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.
	

