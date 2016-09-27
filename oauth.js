import config from './config';
import moment from 'moment';
import crypto from 'crypto';
import fetch from 'isomorphic-fetch';
import fs from 'fs';
import nodeRSA from 'node-rsa';
import URLSafeBase64 from 'urlsafe-base64';

let getParams = function(obj){
  let str = '';
  for(let key in obj){
    str += key + '=' +obj[key] + '&'
  }
  return str.substring(0, str.length - 1);
}

export default {
  /**
   * 用HMAC-SHA1加密算法加密字符串
   * @param str 待加密字符串
   * @returns {*} 加密后的字符串,base64编码
   */
  encryptHMACSHA1: function (str) {
    let hmac = crypto.createHmac('SHA1', config.mcloud.appSecret);
    hmac.update(str, 'utf-8');
    return hmac.digest('base64');
  },
  /**
   * 用SHA1加密算法加密字符串
   * @param str 待加密的字符串
   * @returns {*} 加密后的字符串，16进制
   */
  encryptSHA1: function (str) {
    let sha1 = crypto.createHash('SHA1');
    sha1.update(str);
    return sha1.digest('hex');
  },
  /**
   * 用MD5加密算法加密字符串
   * @param str 待加密的字符串
   * @returns {*} 加密后的字符串，16进制
   */
  encryptMD5: function (str) {
    let md5 = crypto.createHash('md5');
    md5.update(str, 'utf-8');
    return md5.digest('hex');
  },
  /**
   * 获取OAuth协议的相关变量
   * @param token 通过getAccessToken函数获取到的token
   * @returns {Object}
   */
  getOAuthHeader: function (token) {
    let oauth = {
      oauth_consumer_key: config.mcloud.appId,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: moment().valueOf(),
      oauth_nonce: '',
      oauth_version: '1.0',
      oauth_token: token
    };
    oauth.oauth_nonce = this.encryptMD5(moment().valueOf() + '');
    return oauth;
  },
  /**
   * 拼接待加密的字符串(OAuth signature的明文字符串)
   * @param method http请求方法
   * @param url http请求路径
   * @param params OAuth相关参数
   * @returns {string} 拼接后的字符串
   */
  getBaseString: function (method, url, params) {
    //OAuth base string生成协议
    //httpMethod + "&" + url_encode(url) + "&" +
    //sorted_query_params.each  { | k, v |
    //url_encode ( k ) + "%3D" +
    //url_encode ( v )
    //}.join("%26")。
    let keyValue = [];
    for (let key in params) {
      keyValue.push(encodeURIComponent(key) + '%3D' + encodeURIComponent(params[key]));
    }
    keyValue.sort();
    return method + '&' + encodeURIComponent(url) + '&' + keyValue.join('%26');
  },
  /**
   * 获取token
   * @returns {*}
   */
  getAccessToken: async function () {
    let version = "1.1";
    let appid = config.mcloud.appId;
    let secret = config.mcloud.appSecret;
    let timestamp = moment().valueOf();
    let nonce = this.encryptMD5(timestamp + '');
    let arr = [version, appid, secret, timestamp + '', nonce];
    arr.sort();
    let sign = this.encryptSHA1(arr.join(''));

    let authorization = 'OpenAuth2 version="' + version + '",appid="' + appid + '",timestamp=' + timestamp + ',nonce="' + nonce + '",sign="' + sign + '"';
    let res = await fetch('http://do.kdweibo.com/openauth2/api/appAuth2', {
      method: 'POST',
      headers: {
        authorization: authorization
      }
    });
    let resData = await res.json();
    return resData;
  },
  /**
   * RSA加密算法
   * @param str 待加密的字符串
   * @return {Buffer} 加密后的字符串(Buffer类型)
   */
  encryptRSA: function (str) {
    let stat = fs.statSync(config.mcloud.rsaFilePath);
    let fd = fs.openSync(config.mcloud.rsaFilePath, 'r');
    let buffer = new Buffer(stat.size);
    fs.readSync(fd, buffer, 0, buffer.length);
    let key = new nodeRSA(buffer, 'pkcs8-private-der');
    return key.encryptPrivate(str, 'buffer');
  },
  /**
   * AES加密算法
   * @param key 加密密钥
   * @param str 待加密字符串
   * @returns {Buffer} 加密后的字符串(Buffer类型)
   */
  encryptAES: function (key, str) {
    let aes = crypto.createCipheriv('aes-128-ecb', key, '');
    let middle = aes.update(str,'utf8', 'buffer');
    let res = aes.final('buffer');
    return Buffer.concat([middle, res], middle.length + res.length);
  },
  /**
   * 调用云之家API
   * @param token token
   * @param url API地址
   * @param data API参数
   * @returns {Object} 调用结果，参考API文档
   */
  sendRequest: async function(token, url, data){
    //拼接authorization Header信息
    //eg.
    // OAuth oauth_consumer_key="56072101",oauth_signature_method="HMAC-SHA1",oauth_timestamp="1470130039222",oauth_nonce="e3d85abce766191f7b8b24cfa92c16ba",oauth_version="1.0",oauth_token="d43d51f7c2bb0d166fd26d9c1306658d",oauth_signature="QY6bud1bngvLea8FIgNw72ZqdIM="
    let authHeaders = this.getOAuthHeader(token);
    let baseStr = this.getBaseString('POST', url, authHeaders);
    let sign = this.encryptHMACSHA1(baseStr);
    authHeaders.oauth_signature = sign;
    let authorization = 'OAuth ';
    for(let key in authHeaders){
      authorization += key+ '="'+ authHeaders[key] +'",';
    }
    authorization = authorization.substring(0, authorization.length - 1);

    //加密数据
    let enc = this.encryptRSA(config.mcloud.aesKey); //使用RSA加密AES密钥
    let encryptData = this.encryptAES(config.mcloud.aesKey, JSON.stringify(data)); //使用AES加密data

    //拼接两次加密结果，并使用URLSafeBase64进行编码
    let finalData = Buffer.concat([enc, encryptData], enc.length + encryptData.length);
    let base64Data = URLSafeBase64.encode(finalData.toString('base64'));

    //发送http请求，并处理返回结果
    let res = await fetch( config.mcloud.urlPrefix + url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        authorization: authorization
      },
      body: getParams({eid: config.mcloud.eid, nonce: this.encryptMD5(moment().valueOf()+''), data: base64Data})
    });
    let resData = await res.json();
    return resData;
  }
}
