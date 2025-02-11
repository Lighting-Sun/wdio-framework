# UI WebdriverIO Automation practice framework

## Tutorial on how to run from github actions [you need at least read permissions in the repository for this]
Please kindly ask the owner for access in case you want to try this out!
### Custom run using the project using github actions

You can run this repository without downloading it 

1. In this repositoy click on **Actions**
2. Select the **CI on Demand** Option
![GoToActions](https://github.com/user-attachments/assets/34569ec8-223c-4329-863e-e2922dcfb8d6)

3. Click on the **Run Workflow** Option  
4. you can customize your run by selecting **environment**, **browser** and **suite**
5. Optionally you can also check the allure report option if you want to be able to download the allure report (see [Visual Studio Code](https://github.com/Lighting-Sun/wdio-framework/edit/main/README.md#visual-studio-code-only-follow-this-if-you-want-to-open-the-resulting-allure-report) section bellow on how to visualize the report)
6. Click on run worflow (you might need to reload the page so the new execution is visible)
![RunningWorkflow](https://github.com/user-attachments/assets/ff199856-d8e1-4e89-a013-664de3fe9afb)


#### Checking execution details

1. Once the workflow is completed click on the workflow
2. Click on the job
3. Click on the step that was run, in this case Test is the one that contains the code that was executed
4. You can now check the details for this run
![RunDetails](https://github.com/user-attachments/assets/65f4e253-ee01-47dd-b767-2ac53301975e)


### Visual Studio Code (only follow this if you want to open the resulting allure report)

1. You need to have [Visual Studio Code](https://code.visualstudio.com/) installed
2. Once you have installed Visual Studio Code you need to install Live Server extension to make it easier for you to see the report


#### Installing Live Server

1. Go to Visual Studio Code application.
2. On left sidebar in Visual Studio Code, click Extensions or press Crtl+Shift+X.
3. In the search, type Live server, click on Live Server, then click on install.
![LiveServer](https://github.com/user-attachments/assets/cdce0abf-43b0-428f-9b04-0bc7f3deabca)

#### Downloading and Opening allure report

1. Once the workflow is finished, click on it
2. In the Artifacts setcion click on the download button
![DownloadReport](https://github.com/user-attachments/assets/f2f1cb84-0dcf-468f-b716-0ecf78f335a4)

3. Extract the contents from the folder
4. Open the folder with VS Code
5. Click on Liver server, and that's it!
![OpeningAllureReport](https://github.com/user-attachments/assets/25ec2b21-1709-4138-8c75-fa726d828200)
![image](https://github.com/user-attachments/assets/bcd7da2a-2fe9-4d6b-82dc-9f7d08bf0ace)


## Tutorial on how to run the project using comand line in a local machine
### Prerequisites
#### JDK Java
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

#### Node JS

1. You must have [Node.js](https://nodejs.org/en) installed (Node.js LTS version recommended)
2. When you are installing Node.js, make sure to check this option
- [x] Automatically install the necesary tools. Note that this will also install Chocolatey. The script will pop-up in a new window after the installation completes.

![image](https://github.com/user-attachments/assets/f70fa198-bba2-4069-8921-805e9b3d528d)

#### Browsers

Installed:
* Chrome
* Firefox

#### Visual Studio Code
1. You must have [Visual Studio Code](https://code.visualstudio.com/) installed
2. Once you have installed Visual Studio Code you need to install a couple of plugins to help you set up the framework.
These plugins are Prettier and ESlint

##### Installing Prettier in VS code
1. Go to Visual Studio Code application.
2. On left sidebar in Visual Studio Code, click Extensions or press Crtl+Shift+X.
3. In the search, type Prettier and click Prettier - Code formatter, then click on install.

![PrettierInstall](https://github.com/user-attachments/assets/51619747-09d0-4925-84a0-4a73e5aa1ca0)

##### Installing ESLint
1. Go to Visual Studio Code application.
2. On left sidebar in Visual Studio Code, click Extensions or press Crtl+Shift+X.
3. In the search, type ESLint and click ESlint, then click on install.

![ESlintInstall](https://github.com/user-attachments/assets/dc64d1c8-b275-4366-ae3a-2df2c32bc05c)

### Download and open project

1. Click on the code button in this repository
2. Select the Download Zip option
3. Extract the .zip file with the Extract here option
4. Place the project folder on the desired location

#### Open and run project

1. Right click on the folder and open it with Visual Studio Code

![OpenProject](https://github.com/user-attachments/assets/c12cbda0-4f60-42c8-b608-55b0576d921c)

2. In Visual Studio Code, open new terminal with `Ctrl+Shift+` or `Ctrl+Shift+ñ` or on top bar click Terminal, then click New Terminal

![OpenTerminal](https://github.com/user-attachments/assets/89bb47e9-636e-4004-82d9-ce3ba86cf81e)

3. Type `npm install` and wait all packages will be downloaded

4. create a .env file inside the root project folder (Make sure to ask the owner for the values)
```
USEREMAIL=
USERPASSWORD=
SLACK_WEBHOOK_URL=
BROWSERSTACK_USERNAME = 
BROWSERSTACK_ACCESS_KEY =
```

* To Run All test cases type
  ```
  npx wdio
  ```
* To run in a specific browser apppend the browser name **chrome** and **firefox** are the only valid options
  ```
  npx wdio --browser firefox
  ```
* To run a specific suite append the suite name **regression** and **loginAndPurchase** are the valid options
  ```
  npx wdio --suite regression
  ```

#### Open allure report

1. After the excecution, make sure to check that there's a reports folder containing both allure results and report
![image](https://github.com/user-attachments/assets/982cd954-e0ba-45c1-b449-3b3580602f16)
2. Type the following command to open the report
  ```
  npm run open-allure 
  ```
3. The report should open and you should be able to check it out!
![image](https://github.com/user-attachments/assets/4c432e46-62de-4d6a-8790-51cd799217c9)
