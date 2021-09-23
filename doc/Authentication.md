## Content can be protected by password

Albums and media can be protected by password. Various passwords can be used for different albums/media.

### Configuration

MyPhotoShare manages the password using two types of file:

#### The file that sets the passwords (passwords setter)

This files resides in the configuration directory (usually /etc); its name (without the path) is set by option `password_file`.

The _passwords file_ is in the configuration directory because putting the passwords declaration inside the albums would expose them.

The _passwords file_ has many lines: each line has:
- a _password identifier_; an identifier can have every non-space character except '-' (dash) and ',' (comma);
- the corresponding password;

identifier and password are separated by one or more _spaces_.

After the identifier and the following spaces, _everything_ till the end of line is the password, i.e., the password includes the trailing spaces, if any; this is a feature, it is intended to make more secure passwords.

#### The files that apply the passwords (password appliers)

The album tree will have _password appliers_ (the actual name is set by the option `passwords_marker`), whose lines may be either:

* a _password identifier_ without anything else: in this case the album and all its subalbums will be protected by the password assigned to the identifier;
* a _password identifier_ followed by some flag (or a dash if none) and a _pattern_ (shell wildcards are understood): the subalbums/media matched by the pattern will be protected by the password assigned to the identifier;

The _password identifier_ is used to pick the password from the _passwords file_ whose

The flags field contains some of the available flags, comma-separated (or a dash if none), without any space withing them:
- "ci/cs": case sensitive/insensitive (default: ci)
- "part/whole": whole name/part o it (default: part)
- "filesonly/dirsonly/both": only check against file names/dir names (default: both)

The _pattern_ will match the entire file/album name or a part of it, according to the "part/whole" flag:
- if "whole", `jpg` will only match the `jpg` file (that is, probably nothing), in order to match files ending in `jpg` you must use `*.jpg`;
- if "part", `jpg` will match all the files which begin, contain or end with "jpg";

The available wildcards are documented at https://docs.python.org/3.4/library/fnmatch.html.

### How the scanner manages the passwords

When the scanner finds a _password_ files inside an album, it reads it line by line:

* if the line is a single '-', all the passwords are reset for the subtree;
* if the line is a nude identifier, it applies the password specified by it to the whole subtree/media;
* if the line has more content, it reads the case flag and the pattern, and uses them to match the album name and the file names; the `fnmatch` library (https://docs.python.org/3/library/fnmatch.html) is used for the match.

The encrypted passwords aren't included in any file: for each password, a random code is generated, and its value is included in the json album files.

The encrpted password is saved as a file name in a `passwords_subdir` option, the scanner writes inside it the corresponding code.

### How the javascript manages the passwords

When no password has been entered and matched yet, only the unprotected albums are loaded. An (optional) padlock is shown aside the right menu icon, telling the user that some protected content is available in the subalbum tree.

Clicking on the padlock or the equivalent right menu entry or hitting the _u_ ("unlock") key, the authorization form is shown, and, if the md5 of the password entered by the user matches the md5 of some password, the protected content unlocked by that password is added.

If a direct link of a protected content is requested, the the authorization form is shown, and, on match, the content is shown.

When performing a search, protected content is not included in the results: actually, the javascript code doesn't know it until it loades the protected content json files, which will happen when a matching password is entered.

Similarly, the maps don't include the point for the protected photos.

### Privacy considerations

Using the browser developer tools, the only information a user could retrieve is the album property _numsProtectedMediaInSubTree_, which lists the number of protected media in the tree by password codes (random numbers) combinations. So a malicious user would only know that some protected content is inside the album.

#### Do not allow listing of directories content

It's important that the directory listing feature of `apache` (or the equivalent of other _web server_) be disabled; otherwise, requesting the `cache` or `albums` directory would show all the content.

#### Beware of guessable media names

`myphotoshares` doesn't change anything in the albums tree, so a protected media or directory name could be guessed if muy similar to the unprotected ones. For a higher privacy, protected media/directories should have unguessable names.

#### Change the password marker file name

The option `passwords_marker` must be changed in the config file; otherwise a malicious user could access it and know what you are protecting: from the marker content he/she could guess something of the protected content in the albums tree.

### Optional: allow the user to ask for the password

The user could forget or loose the password. If the `request_password_email` option is set in the configuration file, the authentication dialog allows the user to send an email requesting the password.

## Optional: Deployment Makefiles

Both the scanner and the webpage have a `make deploy` target, and the scanner has a `make scan` target, to automatically deploy assets to a remote server and run the scanner. For use, customize `deployment-config.mk` in the root of the project, and carefully read the `Makefile`s to learn what's happening.

This is a feature from original Jason's `photofloat`, very probably it won't work.
