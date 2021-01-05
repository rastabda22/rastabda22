# Frequently Asked Questions

## How to create metadata album.ini files in an album tree?

You have a bunch of picture files in many directories and you want to create the corresponding `album.ini`
files to associate metadata to your pictures.

The command `make_album_ini.sh` (or `myphotoshare_make_album_ini` in Debian/Ubuntu) can be used to create a
default `album.ini` file in a directory. Use it like `$ make_album_ini.sh /usr/local/share/media` to create
the `album.ini` file into `/usr/local/share/media` directory. The `album.ini` file will contain an entry for
all pictures in that directory.

To create the `album.ini` files in all subdirectories too, run the command like:

```sh
# Execute make_album_ini.sh on all subdirectories of the album tree.
$ find /usr/local/share/media -type d -exec make_album_ini.sh {} \;
```

## How to update album.ini files after adding new pictures to albums.

You have added new pictures in some albums and you want to update the corresponding `album.ini` files with
the picture entries.

To do so, just run `make_album_ini.sh` command (or `myphotoshare_make_album_ini` under Debian/Ubuntu) with
the directory name as argument.

## How to update all album.ini files to support auto-tagging?

You already have existing `album.ini` files in an albums tree but they were created a long time ago and you
want to use the new templates to support auto-tagging extensions (
[mps_autofaces](https://gitlab.com/pmetras/mps_autofaces) or [mps_autoscenes](https://gitlab.com/pmetras/mps_autoscenes)).

Note that the following procedure only update existing `tags` options when they exist in `album.ini` files,
as automatically created when using `make_album_ini.sh` command. If you created your `album.ini` files manually
without adding `tags`, the procedure won't add them.

Run `make_album_ini.sh` command (or `myphotoshare_make_album_ini` under Debian/Ubuntu) in the directory to
update the `album.ini` file to the new template.

To do it for the whole tree, updating existing `album.ini` files, without creating new ones:

```sh
$ find /usr/local/share/media/ -type d -exec test -e {}/album.ini \; -a -exec bin/make_album_ini.sh {} \;
Old album.ini syntax: patching old values.
0 media added to '/usr/local/share/media/album.ini'
...
```

In case of problem, the original files is kept in a backup file `album.inibkp`.

You can roll back the whole operation with:

```sh
# Restore album.inibkp files to album.ini
$ find /usr/local/share/media/ -type f -name 'album.ini' -exec mv "{}bkp" "{}" \;
```

## How to organize albums to simplify metadata management?

How to organize your pictures to ease metadata management. Here is a procedure to simplify your life:

1. Put all pictures related to a common event or date or place in a directory. Create different directories and subdirectories.
   When there are more than a few tens of files in a directory, it smells that you should create another directory.
   For instance, you could have an album tree like:

   ```
   albums
     +-- Year
           +-- Month
                 +-- Event
                       +-- Day or place or special event
   ```

1. Create the `album.ini` files for the albums. You can use the one-liner:

   ```sh
   $ find albums -type d -exec make_album_ini.sh {} \;
   ```

1. Now that all your pictures have entries in the `album.ini` files, you can edit their metadata. As they share a
   common place or date or event, you'll be able to factor their properties in the `album.ini` file. Here is an example:

   ```ini
   [DEFAULT]
   #tags = %(auto_tags)s,  
   auto_tags = %(auto_faces)s, %(auto_scenes)s
   auto_scenes = 
   auto_faces = 
   latitude = 48.86661543110166
   longitude = 2.43147454088254
   place_name = Montreuil
   region_name = Île-de-France
   country_name = France
   date = 2021-04-12

   [album]
   title = Brunch with Mary
   description = Mary invited me to brunch with her.
   #tags = %(auto_tags)s,  

   [Picture1.jpg]
   title = Hot coffee cup
   description = The restaurant was a nice place.
   tags = %(auto_tags)s, 

   [Picture2.jpg]
   ...
   ```

   As you see in the example, all commun metadata has been easily factored in the `[DEFAULT]` section and the
   pictures individual metadata that must be typed is minimal.

1. Try MyPhotoShare extensions to get automatic face recognition ([mps_autofaces](https://gitlab.com/pmetras/mps_autofaces)) or
   automatic scenes detection ([mps_autoscenes](https://gitlab.com/pmetras/mps_autoscenes)).
