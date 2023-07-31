"ui";

ui.layout(
  <drawer id="drawer">
    <vertical>
      <appbar>
        <tabs id="tabs" />
      </appbar>
      <viewpager id="viewpager">
        <frame padding="20 10">
          <vertical padding="40 10">
            <vertical h="auto">
              <text text="无障碍权限" textSize="17sp" textColor="black" />
              <Switch id="autoService" text="依次点击:无障碍 > 已下载的应用 > 好友检测" checked="{{auto.service != null}}" w="auto" />
            </vertical>
            <text id="detection" text="开始检测" textSize="17sp" textColor="black" marginTop="15" />
            {/* <text id="batchRemark" text="批量备注" textSize="17sp" textColor="black" marginTop="15" /> */}
            <text id="cleanData" text="清除数据" textSize="17sp" textColor="black" marginTop="15" />
            {/* <vertical h="auto" marginTop="15">
              <text text="问题反馈" textSize="17sp" textColor="black" />
              <text text="问题反馈或更多有趣APP" textSize="15sp" />
            </vertical> */}
          </vertical>
        </frame>
        <frame >
          <list id="goodList">
            <horizontal w="*" h="auto" bg="#f3f3f3" padding="15" marginBottom="10">
              <vertical layout_weight="3">
                <text text="{{name}}" />
                <text marginTop="10" text="{{descStr}}" />
              </vertical>
              <vertical layout_weight="1">
                <button text="好朋友" style="Widget.AppCompat.Button.Colored" layout_gravity="right" w="auto" h="auto" />
              </vertical>
            </horizontal>
          </list>
        </frame>
        <frame>
          <list id="badList">
            <horizontal w="*" h="auto" bg="#f3f3f3" padding="15" marginBottom="10">
              <vertical layout_weight="3">
                <text text="{{name}}" />
                <text marginTop="10" text="{{descStr}}" />
              </vertical>
              <vertical layout_weight="1">
                <button text="其他情况" layout_gravity="right" h="auto" w="auto" />
              </vertical>
            </horizontal>
          </list>
        </frame>
      </viewpager>
    </vertical>
    <vertical layout_gravity="left" bg="#ffffff" w="280">
      <img w="280" h="200" scaleType="fitXY" src="http://images.shejidaren.com/wp-content/uploads/2014/10/023746fki.jpg" />
      <list id="menu">
        <horizontal bg="?selectableItemBackground" w="*">
          <img w="50" h="50" padding="16" src="{{this.icon}}" tint="{{color}}" />
          <text textColor="black" textSize="15sp" text="{{this.title}}" layout_gravity="center" />
        </horizontal>
      </list>
    </vertical>
  </drawer>
);

// 存储
const GOOD_KEY = 'goodItems';
const BAD_KEY = 'badItems';
var storage = storages.create("javaedit.com:wechatFriend");
var goodItems = storage.get(GOOD_KEY, []);
var badItems = storage.get(BAD_KEY, []);
// 渲染数据
applyData();

ui.goodList.on("item_click", function (item, i, itemView, listView) {
  setClip(item.id);
  toast("已复制微信号");
});

ui.badList.on("item_click", function (item, i, itemView, listView) {
  setClip(item.id);
  toast("已复制微信号");
});

//设置滑动页面的标题
ui.viewpager.setTitles(["主页", "正常", "异常"]);
//让滑动页面和标签栏联动
ui.tabs.setupWithViewPager(ui.viewpager);

// 无障碍按钮
ui.autoService.on("check", function (checked) {
  // 用户勾选无障碍服务的选项时，跳转到页面让用户去开启
  if (checked && auto.service == null) {
    app.startActivity({
      action: "android.settings.ACCESSIBILITY_SETTINGS"
    });
  }
  if (!checked && auto.service != null) {
    auto.service.disableSelf();
  }
});

// 开始检测按钮
ui.detection.on("click", function () {
  startDetection();
  toast('开始检测，按减少音量键结束');
});

// 清除数据按钮
ui.cleanData.on("click", function () {
  cleanData();
  applyData();
  storageData();
  toast('清除成功');
});

// 当用户回到本界面时，resume事件会被触发
ui.emitter.on("resume", function () {
  // 此时根据无障碍服务的开启情况，同步开关的状态
  ui.autoService.checked = auto.service != null;
});

function cleanData() {
  wxIdArr = [];
  goodItems = [];
  badItems = [];
}

function applyData() {
  ui.goodList.setDataSource(goodItems);
  ui.badList.setDataSource(badItems);
}

function storageData() {
  storage.put(GOOD_KEY, goodItems);
  storage.put(BAD_KEY, badItems);
}

/*** 上面是UI逻辑，下面就是开线程获取微信数据的逻辑了 ***/

// 默认等待控件渲染的时间
const WIDGET_TIME = 500;
// 检查名字的正则，格式：王谷雨(xx雨)
const FRIEND_REGEX = /\(\*+.*\)/;
// 好友判断规则:https://mp.weixin.qq.com/s/v5ejXKQbDTI6cbmSSYMyaw

//屏蔽音量下键
events.setKeyInterceptionEnabled("volume_down", true);
//按音量下停止
events.onKeyDown("volume_down", function (event) {
  toast("执行中断")
  // 关闭线程
  threads.shutDownAll();
  // 重新渲染数据
  applyData();
  // 保存数据
  storageData();
})
// 启用按钮监听
events.observeKey();

// 获取朋友列表
var wxIdArr = []

function startDetection() {
  if (!launchApp("微信")) {
    toast("微信打开失败")
    return;
  }
  // 清除数据
  cleanData();
  // 刷新数据
  applyData();
  // 开启线程
  var weThread = threads.start(function () {
    sleep(500);
    // 点击两次通讯录，跳到最上面
    jumpFriendList();
    jumpFriendList();

    var divObj = id("js").findOne(WIDGET_TIME);
    // 是否滑动到末尾的标志
    var canScroll = true
    var idx = 0;

    while (canScroll) {
      // 获取当前屏幕的朋友列表
      log("循环次数", idx)
      getFriends();
      // 下滑
      canScroll = divObj.scrollForward()
      // 等滑动完成
      sleep(500)

      idx++
    }

    storageData();
    toast("执行完成")
  });
}


// 跳转通讯录
function jumpFriendList() {
  let txlObj = id("f2s").className("android.widget.TextView").text("通讯录").findOne(WIDGET_TIME)
  clickObj(txlObj)
}

function getFriends() {
  // 不能直接用divObj，滑动之后要重新获取
  let userItemArr = []
  id("js").findOne(WIDGET_TIME).children().forEach(child => {
    var userItem = child.findOne(className("android.widget.LinearLayout").depth(17))
    if (userItem) {
      userItemArr.push(userItem)
    }
  })

  for (var i = 0; i < userItemArr.length; i++) {  //遍历数组
    sleep(500)
    let userItem = userItemArr[i]
    // 进入到用户资料页
    log('进入到用户资料页', i)
    clickObj(userItem)
    let wxId = getWxId() // 微信id
    if (!wxId) {
      log('找不到微信id');
      navigateBack();
      continue;
    }
    let name = getName() // 名字
    let nickname = getNickName() // 昵称
    let user = {
      "name": name,
      "wxId": wxId,
      "nickname": nickname
    }
    log('判断：' + name);
    // 已经判断过的不再重复
    if (wxIdArr.indexOf(wxId) >= 0) {
      log('已存在')
      navigateBack();
      continue;
    }

    wxIdArr.push(wxId)
    // 判断是否是好友
    let checkUser = text("音视频通话").findOne(WIDGET_TIME)
    if (checkUser) {
      log("可能是好友")
      // 进入对话页面
      sleep(500)
      clickObj(text("发消息").findOne(WIDGET_TIME));
      log('进入聊天页')
      // 点击右下角的+号
      clickObj(id("b3q").findOne(WIDGET_TIME));
      // 等待弹框升起来
      sleep(500);
      // 点击转账
      clickObj(id("vg").text("转账").findOne(WIDGET_TIME));
      log('进入转账页')
      // 这里要等一下(不然真实名字还没加载出来)
      sleep(1000);
      let nameObj = id("inh").findOne(WIDGET_TIME);
      if (nameObj) {
        // 好友昵称后面出现真实姓名，则是正常好友
        log('校验转账名字', nameObj.text())
        if (checkFriend(nameObj.text())) {
          log('是好友')
          user.descStr = nameObj.text();
          // 加入白名单
          goodItems.push(user);
        } else {
          log('异常，测试转账')
          // 假转账(不输密码就不会转过去),输入金额
          var moneyInput = id("lg_").findOne(WIDGET_TIME)
          if (moneyInput) {
            moneyInput.setText('0.1')
            // 转账按钮
            var transferBtn = id("ffp").findOne(WIDGET_TIME)
            if (!transferBtn) {
              transferBtn = id("ffq").findOne(WIDGET_TIME)
            }
            clickObj(transferBtn)
            // 如果出现弹框则是异常情况
            // 如果出现转账页面，正常
            let dialogDiv = id("guo").findOne(1000); // 弹框
            if (dialogDiv) {
              if (dialogDiv.text().indexOf('是否正常') >= 0) {
                user.descStr = '被加入黑名单';
              } else if (dialogDiv.text().indexOf('不是收款方好友') >= 0) {
                user.descStr = '被删除好友';
              } else {
                user.descStr = '未知情况';
              }
              // 确定按钮
              let confBtn = id("guw").findOne(WIDGET_TIME)
              if (confBtn) clickObj(confBtn)

              badItems.push(user);
            } else {
              let targetNameDiv = textEndsWith('转账').depth("18").findOne(2000);
              if (targetNameDiv) {
                user.descStr = dialogDiv.text()
                if (checkFriend(targetNameDiv.text())) {
                  goodItems.push(user);
                } else {
                  badItems.push(user);
                }
                back()
              } else {
                user.descStr = '未知情况';
                badItems.push(user);
              }
            }
          }
        }
        // 返回好友列表
        backAndJump();
      }
    } else {
      log("找不到音视频按钮，不是好友")
      user.descStr = "找不到“音视频通话”按钮";
      badItems.push(user);
      navigateBack();
    }
  }
}

function backAndJump() {
  navigateBack()
  sleep(200)
  navigateBack()
  jumpFriendList()
}

// 点击左上角的返回按钮
function navigateBack() {
  let backObj = id("g0").findOne(WIDGET_TIME)
  if (backObj) {
    clickObj(backObj)
  }
}

function checkFriend(name) {
  return FRIEND_REGEX.test(name);
}

// 个人资料页：获取微信号
function getWxId() {
  let idObj = textStartsWith("微信号:").findOne(WIDGET_TIME)
  if (idObj) {
    return idObj.text().replace('微信号:  ', '')
  }
}

// 个人资料页：获取名字
function getName() {
  let nameObj = id("bq1").findOne(WIDGET_TIME);
  if (nameObj) {
    return nameObj.text()
  }
}

// 个人资料页：获取昵称
function getNickName() {
  var nickNameObj = textStartsWith("昵称:").findOne(WIDGET_TIME)
  var nickName;
  if (nickNameObj) {
    let dirtyNickName = nickNameObj.text();
    nickName = dirtyNickName.replace('昵称:  ', '')
  } else {
    nickNameObj = id("bq1").findOne(WIDGET_TIME);
    if (nickNameObj) {
      nickName = nickNameObj.text()
    }
  }
  return nickName
}

// 点击方法
function clickObj(obj) {
  if (!obj) {
    // 关闭线程
    toast('出现异常，停止执行');
    log('出现异常，停止执行');
    threads.shutDownAll();
    return;
  }
  if (obj.clickable()) {
    obj.click();
  } else {
    var b = obj.bounds();
    click(b.centerX(), b.centerY());
  }
}