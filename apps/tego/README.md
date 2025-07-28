<h1 align="center" style="border-bottom: none">
    <div>
        <a style="color:#36f" href="https://www.tachybase.com">
            <img src="https://tachybase-1321007335.cos.ap-shanghai.myqcloud.com/3733d6bd0a3376a93ba6180b32194369.png" width="80" />
            <br>
            Tego
        </a>
    </div>
</h1>

<br>

<p align="center">
  Tego is a pluggable application framework., where developers can build complex application logic, while core developers focus on ensuring the stability of key modules and adapting to different environments. 
</p>
<p align="center">
   <img alt="GitHub License" src="https://img.shields.io/github/license/tegojs/tego">
   <img alt="GitHub Issues or Pull Requests" src="https://img.shields.io/github/issues/tegojs/tego">
   <img alt="Static Badge" src="https://img.shields.io/badge/build-passing-brightgreen">
   <a href="./README.md"><img alt="Static Badge" src="https://img.shields.io/badge/English Version-red"></a>
   <a href="./README.ZH-CN.md"><img alt="Static Badge" src="https://img.shields.io/badge/中文版本-blue"></a>
   <a href="https://gitee.com/tachybase/tachybase"><img alt="Static Badge" src="https://img.shields.io/badge/gitee-green"></a>
   <a href="https://github.com/tegojs/tego"><img alt="Static Badge" src="https://img.shields.io/badge/Github-lightblack"></a>
</p>

# Try

[SaaS Version](https://apps.tachybase.com/) 

You can register an account and password by yourself and create sub-applications within the system to try it out. The system is currently in public beta. If you encounter any issues, feel free to provide feedback, and we will address them as soon as possible.

# Quick Start

```bash 
# Create a new Tego application
npx tego init my-app
# Change directory to the new application
cd my-app
# Start the application
npx tego start --quickstart
# Visit the application
http://localhost:3000
```

Default username：`tachybase`，password: `!Admin123.`
The default database is `sqlite`, you can change it in .env file.
Visit [tachybase.org](https://tachybase.org/en/) to discover more ways to use Tego.

# Upgrade From Previous Version

```bash
# Sync latest packages
npx tego sync
# Start the application
npx tego start --quickstart
```

# License

This project is licensed under the [Apache 2.0](LICENSE) License。

# Third-party Code Notice

The project includes a significant amount of code from third-party libraries such as RequireJS、JsonLogic、NocoBase、Formily and Ant Design. This code adheres to their original licenses and agreements. It will be gradually rewritten in the future. Please be mindful of this when using it in the early stages of the project.

# Contributing

- Provide background information on deployment and usage, and describe the situations where the current system services fall short.
- Share usage cases where the current interaction methods do not meet your needs. We will address these based on their impact level.
- You are welcome to directly contribute code. We currently do not have a dedicated community group, but you can submit ideas through tickets, and we can discuss them together.
