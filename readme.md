# web扫描器

------

网上好用的东西太少，**重复造不一样的轮子：** 

> * 开源
> * 免费
> * 可视化
> * 简单不装逼


## 服务端架构

> * 采用了**socket.io**通信方式，因为暴力破解花时间（6万的字典本机跑完需要10s，后面尝试支持更多的英文单词和数字组合，还有搜索引擎的site功能），用后端主动来推的方式比前端主动区去拉更灵活。
> * 使用了**node.js**的**dns**模块、**mongodb**存储结果
> * 使用了**docker**技术、**nginx**代理
> * 服务器node 环境运行 npm start 或使用pm2...
> * docker运行 docker pull index.alauda.cn/csrf/scanner-docker:latest、docker run -d -e "PASSWORD=ssh密码" scanner-docker

## 前端架构
> * **angular.js**（原生开发太累了）
> * **socket.io**
> * **ng-table**