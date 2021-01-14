#!/bin/bash
###########
# Create a default MyPhotoShare 'album.ini' file based on media content files in a directory.
# Append new media sections if 'album.ini' already exists.
# Name of metadata file (default 'album.ini') is read from config file (default /etc/myphotoshare/myphotoshare.conf)

# All media file extensions that will be considered
# jpg,jpeg,JPG,JPEG,mp4,avi,MP4,AVI,MOV,tiff,TIF,png,PNG

# Check that the script is run with bash
# sh is linked to dash under Ubuntu.
if [ -z "$BASH_VERSION" ]; then
	( >&2 echo "This script must run with bash shell. It does not work with dash!" )
	( >&2 echo "Under Ubuntu, don't use '$ sh $0 $*' to run it.")
	( >&2 echo "Simply do '$ $0 $*'.")
	exit 1
fi


print_usage()
{
	( >&2 echo "Usage: $0 [ -c CONFIG_FILE ] FOLDER" )
	( >&2 echo "Create template of '$ALBUM_INI' file in 'FOLDER' based on its media content." )
	( >&2 echo "When the file '$ALBUM_INI' already exists in 'FOLDER', new media are added to the file." )
	( >&2 echo "Existing metadata is not touched." )
	( >&2 echo "The name of the metadata file '$ALBUM_INI' is taken from configuration file CONFIG_FILE." )
	( >&2 echo )
	( >&2 echo "Options:" )
	( >&2 echo "   -c CONFIG_FILE: Define path and name of the configuration file else" )
	( >&2 echo "   will use '/etc/myphotoshare/myphotoshare.conf'." )
	( >&2 echo )
	( >&2 echo "Example:" )
	( >&2 echo "   $0 ~/Pictures/vacations" )
	( >&2 echo "   Create file '$ALBUM_INI' in '~/Pictures/vacations' with default metadata for all" )
	( >&2 echo "   media contained that in folder. '$ALBUM_INI' name is read from" )
	( >&2 echo "   '/etc/myphotoshare/myphotoshare.conf'." )
}


# Set $CONF with configuration filename
set_config()
{
	# Already defined and valid: we stop there
	if [ -f "$CONF" ]; then
		return
	fi
	# Try to use parameter
	if [ -f "$1" ]; then
		CONF="$1"
	fi
	# Else use default
	if [ -z "$CONF" ]; then
		CONF="/etc/myphotoshare/myphotoshare.conf"
	fi
	# Stop if nothing worked
	if [ ! -f "$CONF" ]; then
		( >&2 echo "Error: Configuration file '$CONF' does not exist." )
		exit 1
	fi
}


# Get metadata filename from configuration and set $ALBUM_INI
set_album_ini()
{
	# Get metadata filename from configuration
	if [ -f "$CONF" ]; then
		ALBUM_INI="$(sed -nr 's/^\s*metadata_filename\s*=\s*((\w|\.)+)\s*.*$/\1/p' "$CONF")"
	fi
	# If not set, use defaults
	if [ -z "$ALBUM_INI" ]; then
		ALBUM_INI="album.ini"
	fi
}


# Process options
while getopts "c:" option; do
	case $option in
		c)
			set_config "$OPTARG"
		;;
		\?)
			set_config
			set_album_ini
			print_usage
			exit 1
		;;
	esac
done
shift $((OPTIND-1))

# Process parameters
DIR=${1%/}

set_config
set_album_ini

if [ -z "$DIR" ]; then
	print_usage
	exit 1
elif [ ! -d "$DIR" ]; then
	( >&2 echo "Argument must be a directory containing media." )
	exit 1
fi

# In case it's an old syntax album.ini file, add the [_DOCUMENTATION_]
# section as the first line and patch the tags and auto_tags options.
# The hack works only on album.ini files generated by the command. If the user
# created the album.ini from scratch, probably that he does not want to use
# auto_tags extension.
if [ -f "$DIR/$ALBUM_INI" ]; then
	read -r first_line < "$DIR/$ALBUM_INI"

	if [ "$first_line" = "# User defined metadata for MyPhotoShare" ]; then
		echo "Old album.ini syntax: patching old values."

		sed -ibkp -E \
			-e '1s/# User defined metadata for MyPhotoShare/[_DOCUMENTATION_]\n# User defined metadata for MyPhotoShare/' \
			-e '1,$s/^(#?)\s*tags\s*=(.*)/\1tags = %(auto_tags)s, \2/g' \
			-e '/\[DEFAULT\]/{s/\[DEFAULT\]/[DEFAULT]\nauto_tags = %(auto_faces)s, %(auto_scenes)s\nauto_scenes = \nauto_faces = /}' \
			"$DIR/$ALBUM_INI"
	fi

	# If we don't find the [_DOCUMENTATION_] section, add one at the top of the file,
	# in case album.ini starts with comments. That way they will be kept even if an
	# extension load and save the album.ini file.
	DOC_EXISTS=$(grep -c "\[_DOCUMENTATION_\]" "$DIR/$ALBUM_INI")
	if [ $DOC_EXISTS -eq 0 ]; then
		echo "No [_DOCUMENTATION_] section; adding it at top of file."
		sed -i -e '1s/^/[_DOCUMENTATION_]\n#################\n/' "$DIR/$ALBUM_INI"
	fi

	# [DEFAULT] section is now manadatory when value interpolation (i.e. %(auto_tags)s) is used.
	DEFAULT_EXISTS=$(grep -c "\[DEFAULT\]" "$DIR/$ALBUM_INI")
	if [ $DEFAULT_EXISTS -eq 0 ]; then
		echo "Missing [DEFAULT] section; adding it."
		echo "" >> "$DIR/$ALBUM_INI"
		echo "[DEFAULT]" >> "$DIR/$ALBUM_INI"
		echo "tags = %(auto_tags)s, " >> "$DIR/$ALBUM_INI"
		echo "auto_tags = %(auto_faces)s, %(auto_scenes)s" >> "$DIR/$ALBUM_INI"
		echo "auto_scenes = " >> "$DIR/$ALBUM_INI"
		echo "auto_faces = " >> "$DIR/$ALBUM_INI"
		echo "#date = " >> "$DIR/$ALBUM_INI"
		echo "#latitude = " >> "$DIR/$ALBUM_INI"
		echo "#longitude = " >> "$DIR/$ALBUM_INI"
		echo "#altitude = " >> "$DIR/$ALBUM_INI"
		echo "#place_name = " >> "$DIR/$ALBUM_INI"
		echo "#region_name = " >> "$DIR/$ALBUM_INI"
		echo "#country_name = " >> "$DIR/$ALBUM_INI"
		echo "" >> "$DIR/$ALBUM_INI"
	fi
fi

# Create a new album.ini file
if [ ! -f "$DIR/$ALBUM_INI" ]; then
	echo "Create file '$DIR/$ALBUM_INI'."
	echo "[_DOCUMENTATION_]" > "$DIR/$ALBUM_INI"
	echo "# User defined metadata for MyPhotoShare" >> "$DIR/$ALBUM_INI"
	echo "########################################" >> "$DIR/$ALBUM_INI"
	echo "# Possible metadata:" >> "$DIR/$ALBUM_INI"
	echo "# - title: To give a title to the photo, video or album." >> "$DIR/$ALBUM_INI"
	echo "# - description: A long description of the media." >> "$DIR/$ALBUM_INI"
	echo "# - tags: A comma separated list of key words." >> "$DIR/$ALBUM_INI"
	echo "#         This option must contain '%(auto_tags)s' to support auto-tagging. " >> "$DIR/$ALBUM_INI"
	echo "# - date: The date the photo was taken, in the format YYYY-MM-DD." >> "$DIR/$ALBUM_INI"
	echo "# - latitude: The latitude of the media, for instance if the media was not geotagged when captured." >> "$DIR/$ALBUM_INI"
	echo "# - longitude: The longitude of the capture of media." >> "$DIR/$ALBUM_INI"
	echo "# - altitude: The sea-level altitude of the capture of media." >> "$DIR/$ALBUM_INI"
	echo "# - country_name: The name of the country where the photo was shot." >> "$DIR/$ALBUM_INI"
	echo "# - region_name: The name of the region." >> "$DIR/$ALBUM_INI"
	echo "# - place_name: The name of the city or town to be displayed." >> "$DIR/$ALBUM_INI"
	echo "#" >> "$DIR/$ALBUM_INI"
	echo "# auto_scenes and auto_faces options are set when using the automatic tagger scripts" >> "$DIR/$ALBUM_INI"
	echo "# mps_autoscenes (https://gitlab.com/pmetras/mps_autoscenes) and" >> "$DIR/$ALBUM_INI"
	echo "# mps_autofaces (https://gitlab.com/pmetras/mps_autofaces).">> "$DIR/$ALBUM_INI"
	echo >> "$DIR/$ALBUM_INI"
	echo >> "$DIR/$ALBUM_INI"
	echo "[DEFAULT]" >> "$DIR/$ALBUM_INI"
	echo "tags = %(auto_tags)s, " >> "$DIR/$ALBUM_INI"
	echo "auto_tags = %(auto_faces)s, %(auto_scenes)s" >> "$DIR/$ALBUM_INI"
	echo "auto_scenes = " >> "$DIR/$ALBUM_INI"
	echo "auto_faces = " >> "$DIR/$ALBUM_INI"
	echo "#date = " >> "$DIR/$ALBUM_INI"
	echo "#latitude = " >> "$DIR/$ALBUM_INI"
	echo "#longitude = " >> "$DIR/$ALBUM_INI"
	echo "#altitude = " >> "$DIR/$ALBUM_INI"
	echo "#place_name = " >> "$DIR/$ALBUM_INI"
	echo "#region_name = " >> "$DIR/$ALBUM_INI"
	echo "#country_name = " >> "$DIR/$ALBUM_INI"
	echo >> "$DIR/$ALBUM_INI"
	echo >> "$DIR/$ALBUM_INI"
fi

# Count the number of media added
SECTION_COUNT=0

# The [album] section
SECTION_EXISTS=$(grep -c "\[album\]" "$DIR/$ALBUM_INI")
if [ $SECTION_EXISTS -eq 0 ]; then
	TITLE=${DIR##*/}
	echo "[album]" >> "$DIR/$ALBUM_INI"
	echo "#title = $TITLE" >> "$DIR/$ALBUM_INI"
	echo "#description = " >> "$DIR/$ALBUM_INI"
	echo "#tags = %(auto_tags)s, " >> "$DIR/$ALBUM_INI"
	echo >> "$DIR/$ALBUM_INI"
	echo >> "$DIR/$ALBUM_INI"
fi

# Loop on album content
SAVEIFS="$IFS"
IFS=$(echo -en "\n\b")
for media in $(ls "$DIR"/*.{jpg,jpeg,JPG,JPEG,mp4,avi,MP4,AVI,MOV,tiff,TIF,png,PNG} 2> /dev/null); do
	SECTION=${media##*/}
	TITLE=${SECTION%.*}
	SECTION_EXISTS=$(grep -c "\[$SECTION\]" "$DIR/$ALBUM_INI")
	if [ $SECTION_EXISTS -eq 0 ]; then
		echo "[$SECTION]" >> "$DIR/$ALBUM_INI"
		echo "#title = $TITLE" >> "$DIR/$ALBUM_INI"
		echo "#description = " >> "$DIR/$ALBUM_INI"
		echo "#tags = %(auto_tags)s, " >> "$DIR/$ALBUM_INI"
		echo "#latitude = " >> "$DIR/$ALBUM_INI"
		echo "#longitude = " >> "$DIR/$ALBUM_INI"
		echo >> "$DIR/$ALBUM_INI"
		echo >> "$DIR/$ALBUM_INI"
		((SECTION_COUNT+=1))
	fi
done
IFS=$SAVEIFS

# Print number of media added in 'album.ini'
echo "$SECTION_COUNT media added to '$DIR/$ALBUM_INI'."

