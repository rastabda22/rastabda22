## Content can be protected by password

Albums and media can be protected by password. Various passwords can be used for different albums/media.

### Configuration

The passwords cannot be in the album tree: the album tree will have _password_ files (the actual name is set by the option `passwords_marker`), whose lines may be:

* a _password identifier_: the album and all its subalbums will be protected by the password assigned to the identifier;
* a _password identifier_ followed by a relative path (possibly with wildcards): the media matched by the path will be protected by the password assigned to the identifier;
* a `-` (_minus sign_): it will stop the passwords from the parent albums propagate into it.

The _password identifier_ is used to pick the password from a _passwords file_ whose name is set by option `password_file`. The _password file_ is needed because putting the passwords inside the albums would expose them.

The _passwords file_ has many lines, each one has with a _password identifier_ and the corresponding password separated by a _space_.

### How the scanner manages the passwords

When the scanner finds a `.password` files inside an album, it applies the password specified by the identifier to the whole subtree/media. The shell wildcards are matched with the `fnmatch` library (https://docs.python.org/3/library/fnmatch.html).

The scanner encrypts the passwords and put them in the json files as an album and media `password` property.

### How the javascript manages the passwords

When an album with password is requested, the authorization form is shown, and if the encrypted password entered by the user matches one of the album/media password, the album/media is show, otherwise the form keeps being showed, and user can use the ´back´ browser button or the `esc` key to go back to the previous position. The encrypted correct password is stored into an array of guessed passwords, which will remain there until the session is closed.

When an album with some protected media is requested, the album is shown, and the protected media thumbnails are replaced with fake ones. When the user wants to show a protected image, the password is requested.

When another protected album or media is requested, the encrypted passwords are checked against the guessed passwords, and if they are already there then the album/media is shown without asking the password again.

## Optional: Deployment Makefiles

Both the scanner and the webpage have a `make deploy` target, and the scanner has a `make scan` target, to automatically deploy assets to a remote server and run the scanner. For use, customize `deployment-config.mk` in the root of the project, and carefully read the `Makefile`s to learn what's happening.
