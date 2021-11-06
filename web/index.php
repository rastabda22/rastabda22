<!DOCTYPE html>
<html lang="en">
<!-- FROM PHP -->
	<head>
		<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
		<meta http-equiv="X-UA-Compatible" content="IE=edge" />
		<meta name="viewport" content="width=device-width, user-scalable=no">
		<meta name="fragment" content="!" />
		<meta name="medium" content="image" />
		<?php
		$jsonString = file_get_contents('cache/options.json');
		if (! $jsonString) {
			echo "Missing options.json file in cache dir. Either:" .
				"<ul>" .
					"<li>Your albums are not indexed yet:" .
						"<ul>" .
							"<li>maybe the scanner hasn't completed its run: be patient until it finishes indexing pictures and videos</li>" .
							"<li>if an error has occurred in the scanner, <a href='https://gitlab.com/paolobenve/myphotoshare/-/issues'>please report the issue</a> so that it can be investigated</li>" .
						"</ul>" .
					"</li>" .
					"<li>Your web site configuration is wrong:" .
						"<ul>" .
							"<li>double check that the directories you set in the web site configuration are the same that you set in the scanner</li>" .
						"</ul>" .
					"</li>" .
				"</ul>" .
				"If you are not the site owner, please report the issue to him/her";
			exit;
		}
		$options = json_decode($jsonString, true);

		// Check if an option is true or 1
		function is_option_set($option_name) {
			global $options;
			return strcasecmp($options[$option_name], "true") == 0 || $options[$option_name] == "1";
		}

		// Check if an option as a list contains a given value
		function has_option_value($option_name, $option_value) {
			global $options;
			return stripos($options[$option_name], $option_value) !== false;
		}
		?>

		<title><?php if ($options['page_title'])
				echo $options['page_title'];
		?></title>

		<link rel="icon" href="favicon.ico" type="image/x-icon"/>

		<?php	if (strcasecmp($options['debug_css'], "false") == 0 || $options['debug_css'] == "0") { ?>
			<link href="css/styles.min.css" rel="stylesheet" type="text/css" />
		<?php	} else { ?>
			<link href="css/000-controls.css" rel="stylesheet" type="text/css" />
			<link href="css/001-fonts.css" rel="stylesheet" type="text/css" />
			<link href="css/002-mobile.css" rel="stylesheet" type="text/css" />
			<link href="css/003-social.css" rel="stylesheet" type="text/css" />
			<link href="css/005-leaflet.css" rel="stylesheet" type="text/css" />
			<link href="css/006-map-popup.css" rel="stylesheet" type="text/css" />
			<link href="css/010-leaflet-prunecluster.css" rel="stylesheet" type="text/css" />
		<?php	}

		if (strcasecmp($options['debug_js'], "false") == 0 || $options['debug_js'] == "0") { ?>
			<script type="text/javascript" src="js/scripts.min.js"></script>
		<?php	} else {
			// Use system wide jQuery if available
			if (
				(strcasecmp($options['use_system_js_libraries'], "true") == 0 || $options['use_system_js_libraries'] == "1") &&
				file_exists("/usr/share/javascript/jquery/jquery.js")
			) { ?>
				<script type="text/javascript" src="/javascript/jquery/jquery.js"></script>
			<?php	} else { ?>
				<script type="text/javascript" src="js/000-jquery.js"></script>
			<?php	}

			// jQuery-hashchange should be in Debian! ?>
			<script type="text/javascript" src="js/001-hashchange.js"></script>

			<script type="text/javascript" src="js/002-preloadimages.js"></script>

			<?php
			// Use system wide jQuery-mousewheel if available
			if (
				(strcasecmp($options['use_system_js_libraries'], "true") == 0 || $options['use_system_js_libraries'] == "1") &&
				file_exists("/usr/share/javascript/jquery-mousewheel/jquery.mousewheel.js")
			) { ?>
				<script type="text/javascript" src="/javascript/jquery-mousewheel/jquery.mousewheel.js"></script>
			<?php	} else { ?>
				<script type="text/javascript" src="js/003-mousewheel.js"></script>
			<?php	}

			// Use system wide jQuery-fullscreen if available
			if (
				(strcasecmp($options['use_system_js_libraries'], "true") == 0 || $options['use_system_js_libraries'] == "1") &&
				file_exists("/usr/share/javascript/jquery-fullscreen/jquery.fullscreen.js")
			) { ?>
				<script type="text/javascript" src="/javascript/jquery-fullscreen/jquery.fullscreen.js"></script>
			<?php	} else { ?>
				<script type="text/javascript" src="js/004-fullscreen.js"></script>
			<?php	}

			// Use system wide modernizr if available
			if (
				! $options['use_internal_modernizr'] &&
				(strcasecmp($options['use_system_js_libraries'], "true") == 0 || $options['use_system_js_libraries'] == "1") &&
				file_exists("/usr/share/javascript/modernizr/modernizr.min.js")
			) { ?>
				<script type="text/javascript" src="/javascript/modernizr/modernizr.min.js"></script>
			<?php	} else { ?>
				<script type="text/javascript" src="js/005-modernizr.js"></script>
			<?php	} ?>

			<script type="text/javascript" src="js/006-jquery-touchswipe.js"></script>

			<?php
			// Use system wide jQuery-lazyload if available
			if (
				(strcasecmp($options['use_system_js_libraries'], "true") == 0 || $options['use_system_js_libraries'] == "1") &&
				file_exists("/usr/share/javascript/jquery-lazyload/jquery.lazyload.min.js")
			) { ?>
				<script type="text/javascript" src="/javascript/jquery-lazyload/jquery.lazyload.min.js"></script>
			<?php	} else { ?>
				<script type="text/javascript" src="js/007-jquery-lazy.js"></script>
			<?php	} ?>

			<script type="text/javascript" src="js/008-leaflet.js"></script>
			<script type="text/javascript" src="js/009-leaflet-prunecluster.js"></script>
			<script type="text/javascript" src="js/010-social.js"></script>
			<script type="text/javascript" src="js/011-jszip.js"></script>
			<script type="text/javascript" src="js/012-jszip-utils.js"></script>
			<script type="text/javascript" src="js/013-md5.js"></script>
			<script type="text/javascript" src="js/014-file-saver.js"></script>
			<script type="text/javascript" src="js/015-jquery-mark.js"></script>
			<script type="text/javascript" src="js/016-lzw-compress.js"></script>
			<script type="text/javascript" src="js/020-classes.js"></script>
			<script type="text/javascript" src="js/031-translations.js"></script>
			<script type="text/javascript" src="js/033-utilities.js"></script>
			<script type="text/javascript" src="js/034-libphotofloat.js"></script>
			<script type="text/javascript" src="js/035-pinch-swipe.js"></script>
			<script type="text/javascript" src="js/036-functions.js"></script>
			<script type="text/javascript" src="js/037-map.js"></script>
			<script type="text/javascript" src="js/038-top-functions.js"></script>
			<script type="text/javascript" src="js/039-display.js"></script>

		<?php }

		// receive the post data, they contain the compressed stringified map/selection album with name packedAlbum
		function passPostArrayToJavascript(){
			if (! empty($_POST)) {
				echo '<script>
					var postData = ' . json_encode($_POST) . '; // alert(postData["packedAlbum"]);
					popupRefreshType = "previousAlbum";
					mapRefreshType = "none";
					</script>';
			}
		}
		passPostArrayToJavascript();
		// no, if postdata isn't undefined, javascript's postData["packedAlbum"] contains the compressed stringified album

		echo '<script>
			function isPhp() {}
		</script>';

		//~ ini_set('display_errors', 1);
		//~ error_reporting(E_ALL);
		// from http://skills2earn.blogspot.it/2012/01/how-to-check-if-file-exists-on.html , solution # 3
		function url_exist($url) {
			if (@fopen($url,"r"))
				return true;
			else
				return false;
		}

		if (! empty($_GET['m'])) {
			// Prevent directory traversal security vulnerability
			$realPath = realpath($_GET['m']);
			if (strpos($realPath, realpath('cache')) === 0  && url_exist($realPath)) {
				// put the <link rel=".."> tag in <head> for letting facebook/google+ load the image/video when sharing
				$linkTag = '<link rel="';
				$videoEnd = ".mp4";
				if (substr($_GET['m'], - strlen($videoEnd)) === $videoEnd)
					// video
					$linkTag .= 'video_src';
				else
					// image
					$linkTag .= 'image_src';
				$linkTag .= '" href="' . $_GET['m'] . '"';
				$linkTag .= '>';
				echo "$linkTag\n";

				// put the <meta property=".."> tags in <head> for letting facebook/google+/etc load the image/video when sharing

				$title = urldecode($_GET['title']);
				echo '<meta property="og:title" content="' . $title . '" />' . "\n";

				echo '<meta property="og:type" content="website" />' . "\n";

				// security: myphotoshare hashes only has letter, numbers, underscores and dashes
				$hash = preg_replace("/[^-_a-z0-9]/i", "", urldecode($_GET['hash']));
				$urlWithoutHash = urldecode($_GET['url']);
				//$urlWithHash = $hash ? $urlWithoutHash . "#" . $hash : $urlWithoutHash;

				$pageUrl = "http" . (($_SERVER['SERVER_PORT'] == 443) ? "s" : "") . "://" . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
				echo '<meta property="og:url" content="' . htmlentities($pageUrl) . '" />' . "\n";

				echo '<meta property="og:description" content="' . $title . '" />' . "\n";

				$mediaPath = urldecode($_GET['m']);
				echo '<meta property="og:image" content="' . htmlentities($urlWithoutHash . $mediaPath) . '" />' . "\n";

				echo '<meta property="og:image:type" content="image/jpg" />' . "\n";

				if (ctype_digit($_GET['w']))
					echo '<meta property="og:image:width" content="' . $_GET['w'] . '">' . "\n";
				if (ctype_digit($_GET['h']))
					echo '<meta property="og:image:height" content="' . $_GET['h'] . '">' . "\n";
				// exit;
			}
		}

		?>

		<?php if ($options['piwik_server'] && $options['piwik_id']) { ?>
			<!-- Piwik -->
			<script type="text/javascript">
				var _paq = _paq || [];
				// _paq.push(['trackPageView']);
				_paq.push(['enableLinkTracking']);
				(function() {
					var u="<?php echo $options['piwik_server']; ?>";
					_paq.push(['setTrackerUrl', u+'piwik.php']);
					_paq.push(['setSiteId', '<?php echo $options['piwik_id']; ?>']);
					var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
					g.type='text/javascript'; g.async=true; g.defer=true; g.src=u+'piwik.js'; s.parentNode.insertBefore(g,s);
				})();
				// // from https://piwik.org/blog/2017/02/how-to-track-single-page-websites-using-piwik-analytics/
				// $(document).ready(function() {
				// 	$(window).hashchange(function() {
				// 		_paq.push(['setCustomUrl', '/' + window.location.hash]);
				// 		_paq.push(['setDocumentTitle', PhotoFloat.convertHashToCacheBase(location.hash)]);
				// 		_paq.push(['trackPageView']);
				// 	});
				// });
			</script>
			<noscript><p><img src="<?php echo $options['piwik_server'] . 'piwik.php?idsite=' . $options['piwik_id']; ?>" style="border:0;" alt="" /></p></noscript>
			<!-- End Piwik Code -->
		<?php } ?>

		<?php if (isset($options['google_analytics_id']) && $options['google_analytics_id']) { ?>
			<!-- google analytics -->
			<script type="text/javascript">
				// from https://git.zx2c4.com/PhotoFloat/tree/web/js/999-googletracker.js
				window._gaq = window._gaq || [];
				window._gaq.push(['_setAccount', '<?php echo $options['google_analytics_id']; ?>']);
				var ga = document.createElement('script');
				ga.type = 'text/javascript';
				ga.async = true;
				ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
				var s = document.getElementsByTagName('script')[0];
				s.parentNode.insertBefore(ga, s);
				$(document).ready(function() {
					$(window).hashchange(function() {
						window._gaq = window._gaq || [];
						window._gaq.push(['_trackPageview']);
						window._gaq.push(['_trackPageview', PhotoFloat.convertHashToCacheBase(location.hash)]);
					});
				});
			</script>
			<!-- End google analytics code -->
		<?php } ?>
	</head>
	<body>
		<?php
			// send the email for requesting the protected content password
			if (! empty($_GET['email']) && $options['request_password_email']) {
				$subject = 'Password request';
				$message =
					'This request has been sent from ' . $_GET['url'] . "\r\n\r\n" .
					'"' . $_GET['name'] . '" <' . $_GET['email'] . '>  says:' . "\r\n\r\n" .
					$_GET['identity'];
				$from = '"myphotoshare" <' . $options['request_password_email'] . '>';
				$headers =
					'From: ' . $from . "\r\n" .
					'Reply-To: "' . $_GET['name'] . '" <' . $_GET['email'] . '>' . "\r\n" .
					'X-Mailer: PHP/' . phpversion();
				// $result = mail($options['request_password_email'], $subject, $message, 'Reply-To:' . $_GET['email']);
				$result = mail($options['request_password_email'], $subject, $message, $headers, '-f ' . $from);
					// ' -f' . $options['request_password_email']
				if (! $result) {
					echo "mail not sent:" . error_get_last()['message'];
					// echo "<br />mail command = mail(" .$options['request_password_email'] . ", " . $subject . ", " . $message . ", " . 'Reply-To:' . $_GET['email'] . ")";
					echo "<br />mail command = mail('" .$options['request_password_email'] . "', '" . $subject . "', '" . $message . "')";
					echo "<br />subject = " . $subject;
					echo "<br />nessage = " . $message;
					exit;
				} else {
					// header($_GET['url']);
				}
				// header(urldecode($_GET['url']));
			}

			// send the email for suggesting a photo geolocation
			if (! empty($_GET['photo']) && $options['request_password_email'] && $options['user_may_suggest_location']) {
				echo "preparing the email...";
				$subject = "Suggestion for geolocation of " . $_GET['photo'];
				$photorealpath = realpath($_GET['photo']);
				$exiftoolArguments =
					" -GPSLatitudeRef=" . ($_GET['lat'] > 0 ? "N" : "S") .
					" -GPSLatitude=" . abs($_GET['lat']) .
					" -GPSLongitudeRef=" . ($_GET['lng'] > 0 ? "E" : "W") .
					" -GPSLongitude=" . abs($_GET['lng']) .
					" " . str_replace(" ", "\ ", $photorealpath);

				$message =
					"Someone at" .
					"\r\n" .
						"    " . $_GET['url'] .
						"\r\n" .
					"suggested that the photo" .
					"\r\n" .
						"    " . $photorealpath .
						"\r\n" .
					"be geolocated at:" .
					"\r\n" .
						"    lat = " . $_GET['lat'] . "\r\n" .
						"    lng = " . $_GET['lng'] .
						"\r\n" .
						"\r\n" .
					"Check the new position:" .
					"\r\n" .
						"    https://www.openstreetmap.org/#map=10/" . $_GET['lat'] . "/" . $_GET['lng'] .
						"\r\n" .
						"\r\n" .
					"Apply it" .
					"\r\n" .
					 	"    overwriting the original non-geotagged photo:" .
						"\r\n" .
							"        exiftool -overwrite_original" . $exiftoolArguments .
						"\r\n" .
						"\r\n" .
						"    without overwriting the original non-geotagged photo:" .
							"\r\n" .
							"        exiftool " . $exiftoolArguments;

				$from = 'myphotoshare <' . $options['request_password_email'] . '>';
				$headers =
					"From: " . $from . "\r\n" .
					"X-Mailer: PHP/" . phpversion();
				echo "<br /><br />sending the email with message:<br /><br />";
				echo $message;
				echo "<br /><br />to " . $options['request_password_email'] . "...";
				$result = mail($options['request_password_email'], $subject, $message, $headers, '-f ' . $from);
					// ' -f' . $options['request_password_email']
				if (! $result) {
					echo "<br /><br />mail not sent: " . error_get_last()['message'];
					// echo "<br />mail command = mail(" .$options['request_password_email'] . ", " . $subject . ", " . $message . ", " . 'Reply-To:' . $_GET['email'] . ")";
					// echo "<br />mail command = mail('" . $options['request_password_email'] . "', '" . $subject . "', '" . $message . "')";
					// echo "<br />subject = " . $subject;
					// echo "<br />message = " . $message;
				} else {
					echo "<br /><br />email sent!";
					// header($_GET['url']);
				}
				exit;
				// header(urldecode($_GET['url']));
			}

			if ($_GET)
				// redirect to same page without parameter
				echo "
		<script>
			$(document).ready(
				function() {
					window.location.href = location.origin + location.pathname + location.hash;
				});
		</script>
	";
		?>
		<div id="fullscreen-wrapper">
			<div id="no-search-string" class="search-failed"></div>
			<div id="no-search-string-after-stopwords-removed" class="search-failed"></div>
			<div id="no-results" class="search-failed"></div>
			<div id="search-too-wide" class="search-failed"></div>
			<div id="social">
			<?php if (!has_option_value('social', 'none')) { ?>
				<div class="ssk-group ssk-rounded ssk-sticky ssk-left ssk-center
					<?php
						switch(strtolower($options['social_size'])) {
							case "small":
								echo " ssk-xs";
								break;
							case "large":
								echo " ssk-lg";
							 	break;
							default:
								echo " ssk-sm";
						}
						if (! is_option_set('social_color')) {
							echo(" ssk-grayscale");
						}
					?>">
				<?php if (has_option_value('social', 'facebook')) { ?>
					<a href="" class="ssk ssk-facebook"></a>
				<?php } if (has_option_value('social', 'whatsapp')) { ?>
					<a href="" class="ssk ssk-whatsapp"></a>
				<?php } if (has_option_value('social', 'twitter')) { ?>
					<a href="" class="ssk ssk-twitter"></a>
				<?php } if (has_option_value('social', 'google')) { ?>
					<a href="" class="ssk ssk-google-plus"></a>
				<?php } if (has_option_value('social', 'linkedin')) { ?>
					<a href="" class="ssk ssk-linkedin"></a>
				<?php } if (has_option_value('social', 'pinterest')) { ?>
					<a href="" class="ssk ssk-pinterest"></a>
				<?php } if (has_option_value('social', 'tumblr')) { ?>
					<a href="" class="ssk ssk-tumblr"></a>
				<?php } if (has_option_value('social', 'vk')) { ?>
					<a href="" class="ssk ssk-vk"></a>
				<?php } if (has_option_value('social', 'buffer')) { ?>
					<a href="" class="ssk ssk-buffer"></a>
				<?php } if (has_option_value('social', 'email')) { ?>
					<a href="" class="ssk ssk-email"></a>
				<?php } ?>
				</div>
			<?php } ?>
			</div>

			<!-- The Modal -->
			<div id="my-modal" class="modal">
				<!-- Modal content -->
				<div class="modal-content">
					<div id="mapdiv"></div>
					<div class="modal-close"></div>
					<div class="map-marker-centered"></div>
					<div class="map-marker-centered-send-suggestion"></div>
				</div>
			</div>

			<div id="auth-text">
				<div id="auth-close"></div>
				<form id="auth-form">
					<div id="auth-question"></div>
					<input type="text" value="username" autocomplete="username" style="display: none;" />
					<input id="password" type="password" autocomplete="current-password" />
					<input type="submit" value="⏎" class="button"/>
				</form>
				<div>
					<div id="request-password"></div>
					<form id="password-request-form">
						<div id="enter-your-data"></div>
						<div id="please-fill"></div>
						<input type="hidden" name="requestpassword" />
						<span id="name-label"></span>
						<input id="form-name" type="text" name="name" />
						<span id="email-label" class="space-before"></span>
						<input id="form-email" type="text" name="email" />
						<span id="identity" class="space-before">
							<span id="identity-label"></span>
							<input id="form-identity" type="text" name="identity" />
						</span>
						<input type="submit" value="⏎" class="button"/>
					</form>
				</div>
			</div>

			<div id="album-and-media-container">
				<div class="hidden" id="media-view">
					<div id="media-box-container">
						<div class="media-box" id="center">

							<div class="media-box-inner">
							</div>

							<div class="media-bar">
								<div class="links">
									<span class="link-button">
										<a class="metadata-show"></a>
										<a class="metadata-hide"></a>
									</span>
									|
									<span class="link-button">
										<a class="original-link"></a>
									</span>
									<a class="menu-map-divider">|</a>
									<span class="link-button">
										<a class="map-link"></a>
									</span>
									<span class="fullscreen">
										<span class="fullscreen-divider"> | </span>
										<span class="link-button">
											<a class="enter-fullscreen"></a>
											<a class="exit-fullscreen"></a>
										</span>
									</span>
								</div>
								<div class="metadata"></div>
							</div>

						</div>
					</div>

					<img id="prev" width="42" height="88" src="img/prev.png">
					<img id="next" width="42" height="88" src="img/next.png">
					<a id="media-select-box">
						<img class="select-box">
					</a>
					<div id="pinch-container" class="hidden">
						<img src="img/pinch-plus.png" id="pinch-in" class="pinch" width="25" height="25">
						<img src="img/pinch-minus.png" id="pinch-out" class="pinch disabled" width="25" height="25">
					</div>
				</div>

				<div id="album-view">
					<div class="title">
						<span class="title-string"></span>
					</div>

					<div id="subalbums"></div>
					<div id="message-too-many-images" role="alert"></div>
					<div id="thumbs"></div>
					<div id="powered-by">
						<span id="powered-by-string">Powered by</span>
						<a href="https://gitlab.com/paolobenve/myphotoshare" target="_blank">MyPhotoShare</a>
					</div>
				</div>
			</div>

			<ul id="right-menu">
				<li id="menu-and-padlock">
					<span id="menu-icon"> ☰ </span>
					<img id="search-icon" src="img/ic_search_black_48dp_2x.png">
					<span id="padlock" class="protection">
						<img width="12px" height="16px" src="img/padlock.png" />
					</span>
				</li>
				<li class="search active hidden-by-menu-selection">
					<form class="caption">
						<input type="search" id="search-field" />
						<img id="search-button" src="img/ic_search_black_48dp_2x.png" />
					</form>
					<ul>
						<li id="inside-words" class="active"></li>
						<li id="any-word" class="active"></li>
						<li id="case-sensitive" class="active"></li>
						<li id="accent-sensitive" class="active"></li>
						<li id="tags-only" class="active"></li>
						<li id="album-search" class="active"></li>
					</ul>
				</li>

				<li class="first-level expandable browsing-mode-switcher active">
					<span class="browsing-mode-switcher caption"></span>
					<ul class="sub-menu hidden">
						<li id="folders-view" class="browsing-mode-switcher radio active"></li>
						<li id="by-date-view" class="browsing-mode-switcher radio active"></li>
						<li id="by-gps-view" class="browsing-mode-switcher radio active"></li>
						<li id="by-map-view" class="browsing-mode-switcher radio active"></li>
						<li id="by-search-view" class="browsing-mode-switcher radio active"></li>
						<li id="by-selection-view" class="browsing-mode-switcher radio active"></li>
					</ul>
				</li>

				<li class="first-level expandable sort album-sort active">
					<span class="sort album-sort caption"></span>
					<ul class="sub-menu hidden">
						<li class='sort album-sort by-date radio'></li>
						<li class='sort album-sort by-name radio'></li>
						<li class='sort album-sort reverse active'></li>
					</ul>
				</li>

				<li class="first-level expandable sort media-sort active">
					<span class="sort media-sort caption"></span>
					<ul class="sub-menu hidden">
						<li class='sort media-sort by-date radio'></li>
						<li class='sort media-sort by-name radio'></li>
						<li class='sort media-sort reverse active'></li>
					</ul>
				</li>

				<li class="first-level expandable ui active">
					<span class='ui caption'></span>
					<ul class="sub-menu hidden">
						<li class='ui hide-title active'></li>
						<li class='ui media-count active'></li>
						<li class='ui slide active'></li>
						<li class='ui square-album-thumbnails active'></li>
						<li class='ui album-names active'></li>
						<li class='ui square-media-thumbnails active'></li>
						<li class='ui media-names active'></li>
						<li class='ui show-descriptions active'></li>
						<li class='ui show-tags active'></li>
						<li class='ui spaced active'></li>
						<li class='ui show-bottom-thumbnails active'></li>
						<li class='ui restore active'></li>
					</ul>
				</li>

				<li class='first-level expandable select active'>
					<span class='select caption'></span>
					<ul class="sub-menu hidden">
						<li class='select everything active'></li>
						<li class='select everything-individual active'></li>
						<li class='select albums active'></li>
						<li class='select media active'></li>
						<li class='select global-reset active'></li>
						<li class='select nothing active'></li>
						<li class='select no-albums active'></li>
						<li class='select no-media active'></li>
						<li class='select go-to-selected active'></li>
					</ul>
				</li>

				<li class='first-level big-albums active'>
					<span id='show-big-albums' class="big-albums caption"></span>
				</li>

				<li class='first-level expandable download-album active'>
					<span class='download-album caption'></span>
					<ul class="sub-menu hidden">
						<li class='download-single-media active'>
							<a class='download-link'></a>
						</li>
						<li class='download-album everything all full active'></li>
						<li class='download-album everything all sized active'></li>
						<li class='download-album everything images full active'></li>
						<li class='download-album everything images sized active'></li>
						<li class='download-album everything videos full active'></li>
						<li class='download-album everything videos sized active'></li>
						<li class='download-album media-only all full active'></li>
						<li class='download-album media-only all sized active'></li>
						<li class='download-album media-only images full active'></li>
						<li class='download-album media-only images sized active'></li>
						<li class='download-album media-only videos full active'></li>
						<li class='download-album media-only videos sized active'></li>
						<li class='download-album selection active'></li>
					</ul>
				</li>

				<li class='first-level non-geotagged-only active'>
					<span id="hide-geotagged-media" class='non-geotagged-only caption'></span>
				</li>

				<li class='first-level protection active'>
					<span id="protected-content-unveil" class='protection caption'></span>
				</li>
			</ul>


			<div id="loading" class="messages" ></div>
			<div id="working" class="messages"></div>
			<div id="downloading-media" class="messages"></div>
			<div id="preparing-zip" class="messages"></div>
			<div id="sending-email" class="messages"></div>
			<div id="you-can-suggest-photo-position" class="messages"></div>
			<div id="sending-photo-position" class="messages"></div>
			<div id="ui-settings-restored" class="messages"></div>


			<div id="folders-browsing" class="browsing-mode-message"></div>
			<div id="by-date-browsing" class="browsing-mode-message"></div>
			<div id="by-gps-browsing" class="browsing-mode-message"></div>
			<div id="by-search-browsing" class="browsing-mode-message"></div>
			<div id="by-selection-browsing" class="browsing-mode-message"></div>
			<div id="by-map-browsing" class="browsing-mode-message"></div>

			<div id="added-individually" class="selection-message"></div>
			<div id="removed-individually" class="selection-message"></div>

			<div id="error-overlay"></div>
			<div id="error-options-file" class="error"></div>
			<div id="error-text-folder" class="error"></div>
			<div id="error-root-folder" class="error"></div>
			<div id="error-text-image" class="error"></div>
			<div id="error-nonexistent-map-album" class="error"></div>
			<div id="error-nonexistent-selection-album" class="error"></div>
			<div id="warning-no-geolocated-media" class="error"></div>

			<div id="by-date-album-sorting" class="sort-message"></div>
			<div id="by-date-reverse-album-sorting" class="sort-message"></div>
			<div id="by-name-album-sorting" class="sort-message"></div>
			<div id="by-name-reverse-album-sorting" class="sort-message"></div>
			<div id="by-date-media-sorting" class="sort-message"></div>
			<div id="by-date-reverse-media-sorting" class="sort-message"></div>
			<div id="by-name-media-sorting" class="sort-message"></div>
			<div id="by-name-reverse-media-sorting" class="sort-message"></div>

			<div id="how-to-download-selection" class="messages"></div>

			<div class="hidden" id="description-wrapper">
				<div id="description">
					<div id="description-title"></div>
					<div id="description-text"></div>
				</div>
				<div id="description-tags"></div>
				<div id="description-hide-show">
					<div id="description-hide"></div>
					<div id="description-show"></div>
				</div>
			</div>
		</div>
	</body>
</html>
