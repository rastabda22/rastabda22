## Content can be protected by password

Albums and media can be protected by password. Various passwords can be used for different albums/media.

### Configuration

The passwords cannot be in the album tree: the album tree will have _password_ files (the actual name is set by the option `passwords_marker`), whose lines may be:

* a _password identifier_: the album and all its subalbums will be protected by the password assigned to the identifier;
* a _password identifier_ followed by the _case sensitive/insensitive flag_ and a _pattern_ (shell wildcards are understood): the subalbums/media matched by the pattern will be protected by the password assigned to the identifier;
* a `-` (_minus sign_): it will stop the passwords from the parent albums propagate into it.

The _password identifier_ is used to pick the password from a _passwords file_ whose name is set by option `password_file`. The _password file_ is needed because putting the passwords inside the albums would expose them.

The _case sensitive/insensitive flag_ is either `cs` or `ci`.

The _pattern_ must match the entire file/album name: `jpg` will only match the `jpg` file (that is, probably nothing), in order to match files ending in `jpg` you must use `*.jpg`; in order to match `my journey.jpg` you can use a pattern like `*journey*`. The available patterns are documented at https://docs.python.org/3.4/library/fnmatch.html.

The _passwords file_ has many lines, each one has with a _password identifier_ and the corresponding password separated by a _space_.

### How the scanner manages the passwords

When the scanner finds a _password_ files inside an album, it reads it line by line:

* if the line is a single '-', all the passwords are reset for the subtree;
* if the line is a nude identifier, it applies the password specified by it to the whole subtree/media;
* if the line has more content, it reads the case flag and the pattern, and uses them to match the album name and the file names; the `fnmatch` library (https://docs.python.org/3/library/fnmatch.html) is used for the match.

The encrypted passwords aren't included in any file: for each password, a random code is generated, and its value is included in the json album files.

The encrpted password is saved as a file name in a `passwords_subdir` option, the scanner writes inside it the corresponding code.

### How the javascript manages the passwords

When an album with password is requested, the authorization form is shown, and, if the encrypted password entered by the user matches the name of some file in the directory specified by `passwords_subdir`, the album/media is show; otherwise, the form keeps being showed, and user can use the ´back´ browser button or the `esc` key to go back to the previous position. The code got from the password file in `passwords_subdir` is stored into an array of guessed codes, which will remain there until the session is closed or the page is reloaded.

When the hash of a protected album or media is requested, the password is requested.

When performing a search, protected content is not included in the results. A menu entry is available in the right menu, in order to unveil the protected content.

The maps don't include the point for the protected photos.

## Optional: Deployment Makefiles

Both the scanner and the webpage have a `make deploy` target, and the scanner has a `make scan` target, to automatically deploy assets to a remote server and run the scanner. For use, customize `deployment-config.mk` in the root of the project, and carefully read the `Makefile`s to learn what's happening.
