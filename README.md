# cst4-game: 天下大计

- 剧本在`application/static/scripts`中，`ending.js`为结局列表，`stage1.js`为目前的剧本。
- 图片放在`application/static/image`中。
- 主要的代码是`application/static/app.js`和`application/static/scripting.js`，前者负责逻辑，后者负责解析剧本。
- 网站只有一个网页，在`application/templates/index.html`中。

## 运行方法

```bash
pip install flask     # install Flask (in Python 3.6)
npm install -g bower  # install bower
bower install         # download static files for the webpages
python run.py         # start the server
```

之后，便可通过<http://127.0.0.1:8000/>访问网页。

## 存在的问题

- [@xllend3](https://github.com/xllend3) 指出，iOS 10.3的WebKit不支持CSS grid layout，而页面中选项的display样式设为`inline-grid`，故无法显示。

## 语法说明

剧本语法基于JavaScript，使用类似JSON的格式存储。

#### 事件
一个事件包含以下域：
- `type`：事件类型，可以为`main`（剧情事件）或者`random`（随机事件）。目前的系统尚未区分两者。
- `name`：事件名称。这一名称会显示在剧情卡片的顶部。
- `stage`：事件阶段，即事件发生的时间在大学的那一年。可以是`大一`到`大四`，当然也可以是`入学前`、`大二暑假`之类的。
- `pages`：事件的各页面。

#### 页面
一个页面包含以下域：
- `id`：页面的唯一标识，一个事件中所有页面的标识必须不同。事件会从`id`为`start`的页面开始。
- `image`：页面图片的链接。
- `text`：页面的文本内容。这个域应当是一个字符串的数组，每个字符串代表一段。此处也支持表达式和嵌套的数组，详情见样例剧本。
- `input`：如果包含了这个域，则页面会显示文本框，并在玩家进入下一页面前将文本框的内容存入这一域指定的变量中。
- `actions`：在玩家做出选择之后执行的动作。
- `actionsBefore`：在页面显示前执行的动作。
- `choices`：玩家可以做出的选择。如果不为空，则每个选项会显示为一个按钮；如果为空，则会显示一个"继续"的按钮。
- `deadline`：代表页面是一个QTE游戏。当存在这一域时，会忽略`image`、`text`、`input`，和`choices`。详情见后文。

#### 选项
一个选项包含以下域：
- `text`：选项的文本内容。此处支持表达式，但其值必须是单个字符串。
- `actions`：选择选项后执行的动作。
- `condition`：使得选项可选的前提条件。这个域应当是一个求值后为布尔值的表达式。

#### 动作
动作有以下一些：
- `flag(var)`、`unflag(var)`：将布尔变量`var`设为真或假。
- `set(var, value)`：将变量`var`的值设为`value`。
- `increase(var, value)`、`decrease(var, value)`：令整型变量`var`的值增加或减少`value`。
- 条件表达式：举个例子，大家体会一下：
  ```javascript
  ge("$魅力", 1).and(lt("$魅力", 3)).then(
      flagged("$送花")
        .then("她笑着谢谢你为她带的花，之后转身向门口走去。")
        .else(flagged("$载人").then())
  )
  ```
  可用的条件表达式包括：
  - 比较：`ge`、`le`、`gt`、`lt`、`eq`、`ne`，均接受两个参数。参数可以是具体值、表达式，或者是变量名；
  - `flagged(var)`：判断布尔变量`var`是否为真；
  - `not(cond)`：将条件表达式`cond`的值取反。
- `jump(id)`：跳转到标识为`id`的页面；如果页面中有多条`jump`动作，那么只有最后一条会生效。请参考动作执行顺序。
- `achieve(name)`：达成名称为`name`的成就。
- `ending(name)`：达成名称为`name`的结局。如果页面中有多条`ending`动作，那么只有最后一条会生效，而且跳转动作不生效。

关于跳转：如果一个页面不包含任何跳转动作，那么会进入下一个事件。

#### 变量
游戏中有两类变量：全局变量与局部变量。
- **全局变量：** 以`#`开头的变量，在整局游戏的所有事件中均生效。
- **局部变量：** 以`$`开头的变量，只在当前事件中有效。

变量有字符串、布尔、整型三种类型。变量不需要提前定义，会在第一次被使用时被赋值为默认值（布尔为假，整型为0，字符串为空串）。变量的类型也会在第一次使用的确定，之后无法更改。

变量可以在文本中显示，文本中形如`{$局部变量}`和`{#全局变量}`的部分都会被替换为对应变量的值。

#### 顺序
动作执行与页面加载的顺序为：
1. 执行页面的`actionsBefore`中的动作；
2. 载入页面文本内容与选项；
3. 玩家做出选择或点击"继续"；
4. 执行页面的`actions`中的动作；
5. 如果玩家做出了选择，那么执行选项的`actions`中的动作。

### QTE游戏
当页面中有`deadline`域时，代表进入QTE游戏。可以进行如下设置：
- `targets`：一个数组，按钮单击次数的各个目标。最小的数字代表及格目标。建议将其按照从小到大的顺序排序。数组至少包含一个整数，最多包含三个。
- `title`：这次肝的项目名称。
- `time`：时间限制。
- `moving`：布尔值，代表按钮是否会移动。目前还没有实现。
- `badChoices`：迷惑按钮的数量。这些按钮是干扰玩家的，会减小已单击次数。

在游戏结束后，会设置局部变量`$__QTE__`，代表玩家达成的目标的最高编号（从1开始）。如果`$__QTE__$`为0，则代表玩家没有达成及格目标。

举个例子，如果目标为`[40, 50, 60]`：
- 单击了39次：`$__QTE__ = 0`；
- 单击了45次：`$__QTE__ = 1`；
- 单击了56次：`$__QTE__ = 2`；
- 单击了666次：`$__QTE__ = 3`。

## 致谢
感谢李林翼（[@llylly](https://github.com/llylly)）、李晓涵（[@lxhAtTHU](https://github.com/lxhAtTHU)）、潘星宇（[@pxxgogo](https://github.com/pxxgogo)）、高童（[@tonygaosh](https://github.com/tonygaosh)）提供剧本。

感谢黄家晖（[heiwang1997](https://github.com/heiwang1997)）提供结局图片。

游戏中的其它图片均从互联网上收集，成就图标来源于[Nova by Webalys](http://www.webalys.com/nova/)。仓库所有者并不拥有其版权。

感谢唐玉涵编写[游戏宣传推送](https://mp.weixin.qq.com/s/qCZGCDGEsSIvSKvdfc2D2A)。感谢李晓涵编写[游戏攻略推送](https://mp.weixin.qq.com/s/lDRfz1xPTvD-L1fLu1oVWQ)。

感谢所有参与测试和提供反馈的同学。
