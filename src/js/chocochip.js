
/**
 *
 * Author - Yuji Kosuga (yujikosuga43@gmail.com)
 *
 */

// DOM Hierarchy
// <section>
//     <h2> # We call this 'header'
//         <span> - domain name
//         <a>    - delete button
//         <a>    - add button
//     <div> # We call this 'content'
//           - the node for cookies, the data-set attribute is set on this node
//             to identify the existence of a new unsaved cookie.
//         <div> # We call this 'div' - a node for a cookie
//             <div class="left">  - left columns
//             <div class="right"> - right columns
//             <div class="clear"> - clearfix

var ChocoChip = {

	/**
	 * This object is only used for making DOM clones for the faster browser manipulation.
	 */
	cloner: {
		section: $('<section>').html(
			'<h2>' +
				'<a class="btn del_domain">DELETE DOMAIN</a>' +
				'<a class="btn add">ADD</a>' +
				'<span></span>' +
			'</h2>' +
			'<div></div>'
		),
		div: $('<div>').html(
			'<div class="left">' +
				'<input name="domain" type="hidden">' +
				'<label>Name<input name="name" type="text" readonly></label>' +
				'<label>Path<input name="path" type="text"></label>' + 
				'<div class="time">' + 
					'<input class="hour" type="number" value="0"> : ' +
					'<input class="min" type="number" value="0"> : ' +
					'<input class="sec" type="number" value="0">' +
				'</div>' +
				'<label>Expire<input name="date" type="text"></label>' +
				'<label>Value<textarea name="value"></textarea></label>' +
			'</div>' +
			'<div class="right">' +
				'<label>Secure<input name="secure" type="checkbox"></label>' +
				'<label>HTTP-Only<input name="httpOnly" type="checkbox"></label>' +
				'<label>Host-Only<input name="hostOnly" type="checkbox"></label>' +
				'<label>Session<input name="session" type="checkbox"></label>' +
				'<div class="btns">' +
					'<a class="btn set">SET</a>' +
					'<a class="btn delete">DELETE</a>' +
				'</div>' +
			'</div>' +
			'<div class="clear"></div>'
		)
	},

	/**
	 * Create the URL of the cookie from the specified arguments
	 *
	 * @param domain string  the domain
	 * @param path   string  the path
	 * @param secure boolean true if the URL is 'https'
	 */
	createUrl: function(domain, path, secure) {
		var prefix = secure ? "https://" : "http://";
		if (domain.charAt(0) == ".")
			prefix += "www";
		return prefix + domain + path;
	},

	/**
	 * Display the header containing the domain name
	 *
	 * @param domain string the domain name
	 */
	showDomain: function(domain) {
		var section = $(ChocoChip.cloner.section).clone().appendTo('#result');
		var header  = $('h2', section);
		$('span'       , header).text(domain);
		$('.add'       , header).on('click', click_add);
		$('.del_domain', header).on('click', click_delete);

		function click_add(e) {
			var header  = $(this).parent();
			var content = $(header).next();

			// Open the content if it is hidden
			if($(content).css('display') != 'none')
				e.stopPropagation();

			// Create an empty form if there is no unsaved form
			if(!$(content).data('unsaved')) {
				setTimeout(function() {
					var domain  = $('span', header).text();
					var content = $(header).next().data({unsaved: true});
					var div     = $(ChocoChip.cloner.div).clone().hide().prependTo(content).slideDown(250);
					ChocoChip.setCookieEntry(null, domain, div);
					$('input[name=name]', div).removeAttr('readonly');
				}, 200);
			}
		}
		function click_delete(e) {
			e.stopPropagation();
			var header = $(this).parent();
			var domain = $(header).find('span').text(); 
			ChocoChip.showDialog("Confirm", "Delete the cookies for "+ domain +"?", function() {
				ChocoChip.deleteCookies({domain: domain}, function() {
					ChocoChip.deleteSection($(header).parent());
					ChocoChip.showPopup('Deleted Cookies for ' + domain + '.');
				});
			});
		}
	},

	/**
	 * 
	 */
	save: function() {
		var div = $(this).parent().parent().parent();
		var name = $('input[name=name]', div).val();
		if(!name) {
			ChocoChip.showPopup('Name is required...');
		} else {
			var hostOnly = $('input[name=hostOnly]', div).prop('checked');
			var domain   = $('input[name=domain]', div).val();
			var obj = {
				name    : name,
				value   : $('textarea[name=value]', div).val(),
				path    : $('input[name=path]'    , div).val(),
				storeId : $('input[name=storeId]' , div).val(),
				secure  : $('input[name=secure]'  , div).prop('checked'),
				httpOnly: $('input[name=httpOnly]', div).prop('checked')
			}; 
			if(!hostOnly)
				obj.domain = domain;

			obj.url = ChocoChip.createUrl(domain, obj.path, obj.secure);

			var date = $('input[name=date]', div).datepicker("getDate");
			if(date && date.getTime()) {
				var expire = $('input[name=date]', div).datepicker("getDate").getTime() / 1000;
				if(expire)
					obj.expirationDate = expire +
						 parseInt($('input.hour', div).val() || 0) * 60 * 60 +
						 parseInt($('input.min' , div).val() || 0) * 60 +
						 parseInt($('input.sec' , div).val() || 0);
			}

			chrome.cookies.set(obj, function(cookie) {
				if(chrome.extension.lastError) {
					ChocoChip.showPopup('Failed in saving the cookie... ' + chrome.extension.lastError);
				} else {
					$(div).parent().data({unsaved: ''});
					ChocoChip.showPopup('Saved a cookie for ' + obj.domain + '.');
				}
			});
		}
	},

	/**
	 * Delete an entire section
	 *
	 * @param section object the section
	 */     
	deleteSection: function(section) {
		$(section).slideUp(250);
		setTimeout(function(){
			$(section).remove();
		}, 1000);
	},

	/**
	 * Delete a cookie
	 */
	deleteSingleCookie: function() {
		var btn = this;
		var div = $(btn).parent().parent().parent();
		var name    = $('input[name=name]', div).val();
		var url     = ChocoChip.createUrl($('input[name=domain]', div).val(),
										  $('input[name=path]'  , div).val(),
										  $('input[name=secure]', div).val());
		if( $(div).parent().data('unsaved') )
			hide();
		else
			ChocoChip.deleteCookie(url, name, hide);

		function hide() {
			// If this is the only cookie this domain has, delete the domain also.
			if( $(div).parent().children().length == 1 ) {
				var section = $(div).parent().parent();
				ChocoChip.deleteSection(section);
			} else {
				$(div).stop(true, true).slideUp(250, function() {
					$(this).parent().data({unsaved: ''});
					$(this).remove();
				});
			}
			ChocoChip.showPopup('Deleted a cookie [' + name +']');
		}        
	},

	/**
	 * Attach the cookie information to the specified div element
	 *
	 * @param cookie Cookie the cookie to be set
	 * @param to     object the div element where the cookie values are set
	 */
	setCookieEntry: function(cookie, domain, to) {
		var expire, hour, min, sec;
		if(cookie && cookie.expirationDate) {
			expire = new Date(cookie.expirationDate * 1000);
			hour = expire.getHours();
			min  = expire.getMinutes();
			sec  = expire.getSeconds();
		}

		$('input[name=domain]'  , to).val(domain);
		$('input[name=name]'    , to).val((cookie && cookie.name)    || '');
		$('input[name=path]'    , to).val((cookie && cookie.path)    || '');
		$('input[name=storeId]' , to).val((cookie && cookie.storeId) || '');

		$('input.hour'          , to).val(hour || 0).prop('readonly', expire == null || (cookie && cookie.session));
		$('input.min'           , to).val(min  || 0).prop('readonly', expire == null || (cookie && cookie.session));
		$('input.sec'           , to).val(sec  || 0).prop('readonly', expire == null || (cookie && cookie.session));

		$('input[name=date]'    , to).prop('readonly', cookie && cookie.session)
			.datepicker()
			.datepicker( (cookie && cookie.session) ? "disable" : "enable")
			.datepicker("setDate", expire)
			.on('change', ChocoChip.toggleTimeChooser);

		$('input[name=secure]'  , to).prop('checked', cookie && cookie.secure);
		$('input[name=session]' , to).prop('checked', cookie && cookie.session).on('click', function() {
			var bool = $(this).prop('checked');
			$('input[name=date]'    , to).prop('readonly', bool).datepicker( bool ? "disable" : "enable");
			$('input.hour'          , to).prop('readonly', bool);
			$('input.min'           , to).prop('readonly', bool);
			$('input.sec'           , to).prop('readonly', bool);
		});
		$('input[name=hostOnly]', to).prop('checked', cookie && cookie.hostOnly);
		$('input[name=httpOnly]', to).prop('checked', cookie && cookie.httpOnly);
		$('textarea[name=value]', to).val((cookie && cookie.value) || '');
	},

	/**
	 * 
	 */
	headerClick: function() {
		var header = this;
		var content = $(header).next();

		if( $(content).children().length )
			$(content).slideToggle(250);
		else {
			var domain = $('span', header).text();
			chrome.cookies.getAll({domain: domain}, function(cookies) {
				for(var key in cookies) {
					var div = $(ChocoChip.cloner.div).clone().appendTo(content);
					ChocoChip.setCookieEntry(cookies[key], domain, div);
				}
				$(content).slideDown(250);
			});
		}
	},

	/**
	 * Search the URL or domain set in the argument
	 *
	 * @param urlOrDomain string The search query
	 */
	search: function(urlOrDomain) {
		if(urlOrDomain) {
			$('#result').empty();
			var v = (urlOrDomain.indexOf('http') >= 0 ? {url: urlOrDomain} : {domain: urlOrDomain});
			ChocoChip.lookupCookieDomain(v, ChocoChip.showDomain);
		}
	},

	/**
	 * @param obj      object   the details object of the getAll method found at 
								http://code.google.com/chrome/extensions/cookies.html
	 * @param callback function the callback function
	 */
	lookupCookieDomain: function(obj, callback) { 
		if(callback) {
			chrome.cookies.getAll(obj, function(cookies) {
				var domains = extractDomains(cookies);
				for(var key in domains) 
					callback(domains[key]);
			});
		}

		/**
		 * Extract domains from the cookies the with no duplication
		 * 
		 * @param cookies an array of Cookie http://code.google.com/chrome/extensions/cookies.html
		 */
		function extractDomains(cookies) {
			var domains = [];
			for(var key in cookies) {
				var _ = cookies[key].domain;
				if(_.charAt(0) == '.')
					_ = _.substring(1);
				if(domains.indexOf(_) == -1)
					domains.push(_);
			}
			return domains.sort();
		}        
	},

	/**
	 * Delete the cookie specified with the url and name
	 *
	 * @param url      string   the URL the cookie belongs to
	 * @param name     string   the name of cookie to be deleted
	 * @param callback function the callback function
	 */
	deleteCookie: function(url, name, callback) {
		chrome.cookies.remove({
			url : url, 
			name: name
		}, function(cookie) {
			if(chrome.extension.lastError)
				ChocoChip.showPopup('Failed in removing the cookie... ' + chrome.extension.lastError);
			else
				if(callback) 
					callback();
		});
	},

	/**
	 * Delete all cookies found by looking up with the specified object
	 *
	 * @param obj      object   the details object of the getAll method found at 
								http://code.google.com/chrome/extensions/cookies.html
	 * @param callback function the callback function
	 */
	deleteCookies: function(obj, callback) {
		chrome.cookies.getAll(obj, function(cookies) {
			for(var key in cookies) {
				var cookie = cookies[key];
				var url    = ChocoChip.createUrl(cookie.domain, cookie.path, cookie.secure);
				ChocoChip.deleteCookie(url, cookie.name);
			}
			if(callback)
				callback();
		});
	},

	/**
	 * Display the popup to show the message
	 *
	 * @param msg string the message to show
	 */
	showPopup: function(msg) {
		$('#popup').text(msg).stop(true,true).fadeIn(250).delay(2500).fadeOut(500);
	},

	showDialog: function(title, msg, okCallback) {
		var dialog = $('#overlay > .dialog'); 
		$(dialog).find('header').text(title);
		$(dialog).find('div.body').text(msg);
		$(dialog).find('footer > .cancel').click(function() {
			$('#overlay').fadeOut(250);
		});
		$(dialog).find('footer > .ok').click(function() {
			if(okCallback)
				okCallback();
			$('#overlay').fadeOut(250);
		});
		$('#overlay').fadeIn(250);
	},

	toggleTimeChooser: function() {
		var divLeft = $(this).parent().parent();
		var bool = $(this).val() ? true : false;
		$('.time input', divLeft).each(function() {
			$(this).prop('readonly', !bool);
		});
	}
};

$(document).ready(function(){
	$('#search').on('keyup', function() { ChocoChip.search($(this).val()); });

	$(document).on('click', '.set'   , ChocoChip.save);
	$(document).on('click', '.delete', ChocoChip.deleteSingleCookie);
	$(document).on('click', 'h2'     , ChocoChip.headerClick);
	
	$("#show_all").on('click', function(){
		$('#result').empty();    
		ChocoChip.lookupCookieDomain({}, ChocoChip.showDomain);
	});
	$("#del_all").on('click', function(){
		ChocoChip.showDialog("Confirm", "Delete all the cookies?", function() {
			ChocoChip.deleteCookies({}, function() { 
				$('#result').empty();
				ChocoChip.showPopup('Deleted All Cookies'); 
			});
		});
	});
	$("#page").on('click', function(){
		$('#result').empty();
		$(window).height(200); // Reset the height for IE
		chrome.tabs.getSelected(null, function(tab) {
			ChocoChip.lookupCookieDomain({url: tab.url}, ChocoChip.showDomain);
		});
	}).click();

	$('#popup').on('click', function() { $(this).stop(true,true).fadeOut(800); });
});