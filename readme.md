# web扫描器·域名篇

------

网上好用的东西太少，**重复造不一样的轮子：** 

> * 开源
> * 免费
> * 可视化
> * 简单不装逼


## 前端-主人
> * [https://github.com/21k/scanner-web](https://github.com/21k/scanner-web)
> * 不漂亮怎么接客！

## 服务端-总管
> * [https://github.com/21k/scanner-server](https://github.com/21k/scanner-server)
> * 和docker、前端的通信均采用了**socket.io**
> * 一个域名启动一个docker、多个用户发起的同一域名采用消息订阅
> * 扫描结果mongo存储

## docker-奴隶
> * [https://github.com/21k/scanner-docker](https://github.com/21k/scanner-docker)
> * 单进程的异步胜过各种奇巧淫技！简单暴力！！