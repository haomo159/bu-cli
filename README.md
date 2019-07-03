## ATP61 sku批量导入工具

### 安装方式

>需要使用超级管理员权限，进行全局安装

```bash
npm install https://github.com/martinlee159/bu-cli.git -g
```

### 使用方式

> 查看帮助信息

```bash
bu-atp61 -h 
# 或者
bu-atp61 --help
```

> 查看版本信息

```bash
bu-atp61 -V
# 或者
bu-atp61 --version
```

> 初始化项目目录

```bash
# 假设要初始化的目录名称为demo，则执行如下命令
bu-atp61 -c -D demo
```

> 发行atp61合约

```bash
# 进入刚刚创建的目录demo，修改initInput/index.json文件，执行如下命令
bu-atp61 -p -k 账户私钥 -H 主机地址
```

> 批量创建账户

```bash
# 进入目录demo，执行如下命令
bu-atp61 -g -k 账户私钥 -H 主机地址 -N 账户个数
```

> 设置承兑方信息

```bash
# 进入目录demo, 修改acceptanceInput/index.json文件, 执行如下命令
bu-atp61 -s -k 账户私钥 -H 主机地址 -d 合约地址
```

> 导入sku信息

```bash
# 进入目录demo, 修改修改skuInput/index.json文件, 执行如下命令
bu-atp61 -i -k 账户私钥 -H 主机地址 -d 合约地址 -f csv文件目录(特定结构)
```

### csv文件格式

```
csv文件格式请参考 csv_demo/sku.csv 文件
```