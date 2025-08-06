> ⚠️ **Caution: This repository is currently undergoing a core refactor.Using the Git version may lead to various unexpected issues.If you encounter problems, feel free to submit an issue on GitHub.**
>
> ✅ For stable production usage, please use:
> - Official frontend and plugin collection: [tegojs/tego-standard](https://github.com/tegojs/tego-standard)
> - Official Docker image: [tegojs/tego-all](https://hub.docker.com/r/tegojs/tego-all)
> - Official npm package [tego](https://www.npmjs.com/package/tego)


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
Tego is a pluggable Node.js framework for building customizable development platforms. It enables developers to create their own no-code/low-code systems or event-driven applications, while the core focuses on stability and environment adaptability.
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

# Contributing

- Provide background information on deployment and usage, and describe the situations where the current system services fall short.
- Share usage cases where the current interaction methods do not meet your needs. We will address these based on their impact level.
- You are welcome to directly contribute code. We currently do not have a dedicated community group, but you can submit ideas through tickets, and we can discuss them together.
