#skylapse-cloud


##Enviroment Setup

Starting from a clean image of the latest RaspbianOS

Lets start by updating apt-get.

```bash
sudo apt-get update
```

Now, lets install the latest version of node and its package manager

```bash
wget http://node-arm.herokuapp.com/node_latest_armhf.deb
sudo dpkg -i node_latest_armhf.deb
```

Next, clone or download the project
```bash
git clone https://github.com/GuiPinto/skylapse-cloud && cd skylapse-cloud
```

##App Setup

Once inside of the root directory of the source code, lets now install our required node packages.
```bash
npm install
```

And now you're ready to rock!
Start the application by using 
```bash
node app.js
```