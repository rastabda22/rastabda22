#!/bin/bash

PROJECT_DIR="$(dirname $(realpath $0))"
DEFAULT_CONF="$PROJECT_DIR/myphotoshare.conf.defaults"
CONF="$1"

if [ -z "$CONF" ]; then
	# The script must be launched with the user's config file
	( >&2 echo )
	( >&2 echo "Usage: ./$0 MYPHOTOSHARE_CONFIG_FILE" )
	( >&2 echo )
	( >&2 echo "Quitting" )
	exit 1
elif [ ! -f "$CONF" ]; then
	( >&2 echo )
	( >&2 echo "Error: file '$CONF' does not exist" )
	( >&2 echo )
	( >&2 echo "Quitting" )
	exit 1
fi

# If can't find default config, try from parent directory in case the script
# is run from 'bin' directory.
if [ ! -e "$DEFAULT_CONF" ]; then
	PROJECT_DIR="$(realpath "$PROJECT_DIR/..")"
	DEFAULT_CONF="$PROJECT_DIR/myphotoshare.conf.defaults"
fi
if [ ! -e "$DEFAULT_CONF" ]; then
	( >&2 echo )
	( >&2 echo "Can't find default config file 'myphotoshare.conf.defaults'." )
	( >&2 echo "Run $0 from MyPhotoShare root directory." )
	( >&2 echo )
	( >&2 echo "Quitting" )
	exit 1
fi


# Parse which minifiers to use from configuration file
MINIFY_JS="$(sed -nr 's/^\s*js_minifier\s*=\s*(\w+)\s*.*$/\1/p' $CONF)"
DEFAULT_MINIFY_JS="$(sed -nr 's/^\s*js_minifier\s*=\s*(\w+)\s*.*$/\1/p' $DEFAULT_CONF)"
MINIFY_JS=${MINIFY_JS:-$DEFAULT_MINIFY_JS}

MINIFY_CSS="$(sed -nr 's/^\s*css_minifier\s*=\s*(\w+)\s*.*$/\1/p' $CONF)"
DEFAULT_MINIFY_CSS="$(sed -nr 's/^\s*css_minifier\s*=\s*(\w+)\s*.*$/\1/p' $DEFAULT_CONF)"
MINIFY_CSS=${MINIFY_CSS:-$DEFAULT_MINIFY_CSS}

echo
echo "$MINIFY_CSS" set as CSS minifier in $CONF
echo "$MINIFY_JS" set as JS minifier in $CONF

unixseconds=$(date +%s)

# Check that local minifiers are installed
case $MINIFY_JS in
	web_service)
		curl https://javascript-minifier.com/ > /dev/null 2>&1
		if [ $? -ne 0 ]; then
			( >&2 echo "'curl' not installed or 'https://javascript-minifier.com/' down" )
			( >&2 echo "Aborting..." )
			exit 1
		fi
	;;
	jsmin3)
		python3 -c 'import jsmin' > /dev/null 2>&1
		if [ $? -ne 0 ]; then
			( >&2 echo "'jsmin' for Python3 is not installed. Look for package 'python3-jsmin' or 'https://github.com/tikitu/jsmin'" )
			( >&2 echo "Aborting..." )
			exit 1
		fi
	;;
	uglifyjs)
		buble -v > /dev/null 2>&1
		if [ $? -ne 0 ]; then
			( >&2 echo "'buble' is not installed and is required for using 'uglifyjs' minifier." )
			( >&2 echo "Look for package 'node-buble' or 'https://github.com/Rich-Harris/buble'" )
			( >&2 echo "Aborting..." )
			exit 1
		fi
		uglifyjs -V > /dev/null 2>&1
		if [ $? -ne 0 ]; then
			( >&2 echo "'uglifyjs' is not installed. Look for package 'node-uglifyjs' or 'http://lisperator.net/uglifyjs/'" )
			( >&2 echo "Aborting..." )
			exit 1
		fi
	;;
esac

case $MINIFY_CSS in
	web_service)
		curl https://cssminifier.com/ > /dev/null 2>&1
		if [ $? -ne 0 ]; then
			( >&2 echo "'curl' not installed or 'https://cssminifier.com/' down" )
			( >&2 echo "Aborting..." )
			exit 1
		fi
	;;
	cssmin)
		cssmin -h > /dev/null 2>&1
		if [ $? -ne 0 ]; then
			( >&2 echo "'cssmin' is not installed. Look for package 'cssmin' or 'https://github.com/zacharyvoase/cssmin'" )
			( >&2 echo "Aborting..." )
			exit 1
		fi
	;;
	rcssmin3)
		python3 -c 'import rcssmin' > /dev/null 2>&1
		if [ $? -ne 0 ]; then
			( >&2 echo "'rcssmin' for Python3 is not installed. Look for package 'python3-rcssmin' or 'https://github.com/ndparker/rcssmin'" )
			( >&2 echo "Aborting..." )
			exit 1
		fi
	;;
esac

# minify all .js-files
cd "$PROJECT_DIR/web/js"
echo
echo == Minifying js files in js directory with $MINIFY_JS ==
echo
CAT_LIST=""
rm -f *.min.js
if [ $? -ne 0 ]; then
	( >&2 echo "Can't write files. Aborting..." )
	exit 1
fi
while read jsfile; do
	newfile="${jsfile%.*}.min.js"
	echo "minifying $jsfile"

	# Check if minified versions are provided by the system (Debian/Ubuntu)
	case $jsfile in
		000-jquery-*)
		if [ -e /usr/share/javascript/jquery/jquery.min.js ]; then
			CAT_LIST="$CAT_LIST /usr/share/javascript/jquery/jquery.min.js"
			echo "... Found system jquery; using it."
			continue
		fi
		;;

		003-mousewheel*)
		if [ -e /usr/share/javascript/jquery-mousewheel/jquery.mousewheel.min.js ]; then
			CAT_LIST="$CAT_LIST /usr/share/javascript/jquery-mousewheel/jquery.mousewheel.min.js"
			echo "... Found system jquery-mousewheel; using it."
			continue
		fi
		;;

		004-fullscreen*)
		# Currently, there is no minified library in the Debian package... So this test is
		# skipped and will be used in future Debian versions
		if [ -e /usr/share/javascript/jquery-fullscreen/jquery.fullscreen.min.js ]; then
			CAT_LIST="$CAT_LIST /usr/share/javascript/jquery-fullscreen/jquery.fullscreen.min.js"
			echo "... Found system jquery-fullscreen; using it."
			continue
		fi
		;;

		005-modernizr*)
		if [ -e /usr/share/javascript/modernizr/modernizr.min.js ]; then
			CAT_LIST="$CAT_LIST /usr/share/javascript/modernizr/modernizr.min.js"
			echo "... Found system modernizr; using it."
			continue
		fi
		;;

		007-jquery-lazyload*)
		if [ -e /usr/share/javascript/jquery-lazyload/jquery.lazyload.min.js ]; then
			CAT_LIST="$CAT_LIST /usr/share/javascript/jquery-lazyload/jquery.lazyload.min.js"
			echo "... Found system jquery-lazyload; using it."
			continue
		fi
		;;
	esac

	case $MINIFY_JS in
		web_service)
			curl -X POST -s --data-urlencode "input@$jsfile" https://javascript-minifier.com/raw > $newfile
		;;

		jsmin3)
			python3 -m jsmin $jsfile > $newfile
		;;

		uglifyjs)
			# We need to use 'buble' first to convert from ES6 to ES5 as uglifyjs only parses ES5.
			buble $jsfile | uglifyjs - -o $newfile
		;;

		*)
			echo "Unsupported Javascript minifier: $MINIFY_JS. Check option 'js_minifier' in '$CONF'"
			echo "Doing nothing on file $jsfile"
			newfile=$jsfile
	esac
	CAT_LIST="$CAT_LIST $newfile"
done << EOF
$(ls -1 *.js | grep -Ev "min.js$")
EOF

# merge all into one single file
cat $CAT_LIST > scripts.min.js


# minify all .css-files
cd "$PROJECT_DIR/web/css"
echo
echo == Minifying css files in css directory with $MINIFY_CSS ==
echo
rm -f *.min.css
if [ $? -ne 0 ]; then
	( >&2 echo "Can't write files. Aborting..." )
	exit 1
fi
ls -1 *.css | grep -Ev "min.css$" | while read cssfile; do
	newfile="${cssfile%.*}.min.css"
	echo "minifying $cssfile"
	case $MINIFY_CSS in
		web_service)
			curl -X POST -s --data-urlencode "input@$cssfile" https://cssminifier.com/raw > $newfile
		;;

		cssmin)
			cssmin < $cssfile > $newfile
		;;

		rcssmin3)
			python3 -m rcssmin < $cssfile > $newfile
		;;

		*)
			( >&2 echo "Unsupported CSS minifier: $MINIFY_CSS. Check option 'css_minifier' in '$CONF'" )
			( >&2 echo "Doing nothing on file $cssfile" )
	esac
done

# merge all into one single file
cat *.min.css > styles.min.css

echo
echo "Completed in $((`date +%s` - $unixseconds)) s."
