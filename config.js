export default {
  mcloud: {
    eid: '企业ID', //云之家的企业ID
    appId: 'appid',//云之家轻应用的appid
    appSecret: 'appSecret',//云之家轻应用的appSecret

    pubId: 'xxx', //云之家发送消息专用的公共号ID
    pubSecret: 'xx', //云之家发送消息专用的公共号Secret

    aesKey: '1234567890123456', //16位的AES秘钥,内容无所谓,但要求一定要16位
    rsaFilePath: 'filepath.key', //云之家安全认证的RSA企业私钥文件,从金蝶的企业云服务平台下载

    urlPrefix: 'http://mcloud.kingdee.com',//云之家API服务器路径
  }
}