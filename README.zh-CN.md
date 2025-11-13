[English](./README.md) | 简体中文 
> ⚠️ **Caution: 本仓库正在进行核心重构开发，使用 git 版本会遇到各种不可预期的事情，有问题可以在 github 上提交 issue。**
>
> ✅ 生产环境请使用：
> - 官方前端和插件集合 [tegojs/tego-standard](https://github.com/tegojs/tego-standard)
> - 官方发布的 docker 镜像 [tegojs/tego-all](https://hub.docker.com/r/tegojs/tego-all)
> - 官方发布的 npm 包 [tego](https://www.npmjs.com/package/tego)

<h1 align="center" style="border-bottom: none">
    <div>
        <a style="color:#36f" href="https://www.tachybase.com">
            <img src="https://tachybase-1321007335.cos.ap-shanghai.myqcloud.com/3733d6bd0a3376a93ba6180b32194369.png" width="80" />
            <br>
            灵矶
        </a>
    </div>
</h1>

<br>

<p align="center">
灵矶是一个可插拔的 Node.js 框架，用于构建可定制的开发平台。它使开发者能够创建属于自己的无代码/低代码系统或事件驱动应用程序，同时其核心专注于稳定性与环境适应性。
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

# 快速开始

```bash 
# 创建一个新的灵矶应用
npx tego init my-app
# 切换到刚创建的目录中
cd my-app
# 启动应用
npx tego start --quickstart
# 访问应用
http://localhost:3000
```

默认用户名：`tachybase`，默认密码: `!Admin123.`
默认数据库为 `sqlite`, 你可以在 .env 文件中修改。
访问 [tachybase.org](https://tachybase.org/) 发现更多方式来使用灵矶。

# 从之前的版本更新

```bash
# 同步最新的包
npx tego sync
# 启动应用
npx tego start --quickstart
```

# 开源许可证

本项目遵循  [Apache 2.0](LICENSE) 开源许可证。

# 贡献

- 欢迎提供部署和使用的背景，以及当前系统服务无法满足的情况。
- 欢迎分享使用案例，尤其是当前交互方式无法满足需求的场景，我们会根据实际影响范围进行处理。
- 欢迎直接贡献代码，我们暂时没有专门的交流群，您可以通过工单提交想法，我们会一起讨论。
