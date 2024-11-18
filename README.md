# UI WebdriverIO Automation practice framework

## Tutorial on how to run the project
## Prerequisites
### JDK Java
1. Make sure you have installed [JDK Java](https://www.oracle.com/java/technologies/downloads/).
![image](https://github.com/user-attachments/assets/a5a1c27a-6161-460b-8458-5040979a59f6)

3. Make sure to copy or save somewhere the path that contains the jdk.
4. Copy jdk path.

![image](https://github.com/user-attachments/assets/b7ee31aa-f033-44cf-a425-0446bcf088e3)

4. On windows, in search bar, type environment variables and click on Edit the system environment variables.

![image](https://github.com/user-attachments/assets/9c6eed74-465f-41b6-a2a2-56c01827169c)

5. In the System properties window, click environment variables.
6. In Environment variables window in Advanced tab, in System variables section, double click Path.
7. In Edit environment variable click New button and paste the path that contains jdk, then click Ok.
8. Close the open windows and that's it, you have JDK installed and windows will know where to find it.
![EnvironmentVariables](https://github.com/user-attachments/assets/253efece-ba39-455a-b139-0d37e2eadbf9)

### Node JS

1. You must have [Node.js](https://nodejs.org/en) installed (Node.js LTS version recommended)
2. When you are installing Node.js, make sure to check this option
- [x] Automatically install the necesary tools. Note that this will also install Chocolatey. The script will pop-up in a new window after the installation completes.

![image](https://github.com/user-attachments/assets/f70fa198-bba2-4069-8921-805e9b3d528d)

### Browsers

Installed:
* Chrome
* Firefox

### Visual Studio Code
1. You must have [Visual Studio Code](https://code.visualstudio.com/) installed
2. Once you have installed Visual Studio Code you need to install a couple of plugins to help you set up the framework.
These plugins are Prettier and ESlint

#### Installing Prettier in VS code
1. Go to Visual Studio Code application.
2. On left sidebar in Visual Studio Code, click Extensions or press Crtl+Shift+X.
3. In the search, type Prettier and click Prettier - Code formatter, then click on install.

![PrettierInstall](https://github.com/user-attachments/assets/51619747-09d0-4925-84a0-4a73e5aa1ca0)

#### Installing ESLint
1. Go to Visual Studio Code application.
2. On left sidebar in Visual Studio Code, click Extensions or press Crtl+Shift+X.
3. In the search, type Prettier and click ESlint, then click on install.

![ESlintInstall](https://github.com/user-attachments/assets/dc64d1c8-b275-4366-ae3a-2df2c32bc05c)

## Download and open project

1. Click on the code button in this repository
2. Select the Download Zip option
3. Extract the .zip file with the Extract here option
4. Place the project folder on the desired location

### Open project

1. Right click on the folder and open it with Visual Studio Code

![OpenProject](https://github.com/user-attachments/assets/c12cbda0-4f60-42c8-b608-55b0576d921c)

## Running the project

1. In Visual Studio Code, open new terminal with `Ctrl+Shift+` or `Ctrl+Shift+ñ` or on top bar click Terminal, then click New Terminal

![OpenTerminal](https://github.com/user-attachments/assets/89bb47e9-636e-4004-82d9-ce3ba86cf81e)

2. Type `npm install` and wait all packages will be downloaded

* To Run All test cases type `npx wdio`
* To run in a specific browser apppend the browser name **chrome** and **firefox** are the only valid options `npx wdio --browser firefox`
* To run a specific suite append the suite name **regression** and **loginAndPurchase** are the valid options `npx wdio --suite regression`
