### 如何运行 ###
cd src/test
ts-node init.ts
ts-node sendJsonTest.ts
怕不方便，改成了是向文件中存储，而不是数据库存储 

src/core:
核心文件
算法库（algorithmLibrary），注册器（register），中央管理者（manager）和四种节点（storage，data，compute，organize）。

src/log:
data是storageNode的文件存储
**nodes.json是当前节点与连接的状态**

src/test:
一些测试的代码
init：初始化注册器节点
sendJsonTest：向中心管理节点发送节点注册和管道连接信息

src/types：
一些用到的全局变量和接口

src/utils/pg:
数据库有关函数
