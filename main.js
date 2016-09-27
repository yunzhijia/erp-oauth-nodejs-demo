import config from './config';
import oauth from './oauth';

//获取token
let testFunc = async function(){
  try {
    let result = await oauth.getAccessToken();
    /**
     * result:
     * { success: true,
     *   data:
     *     { expires_in: 604800,
     *       access_token: '56f988e6add2a0c22062c209dda7e615' } }
     */
    let token = result.data.access_token;


    let url = '/openaccess/input/person/get';
    let params = {
      eid: config.mcloud.eid,
      type: 0,//0.手机号 1.openId
      array: ['xxxxx']
    };

    let resData = await oauth.sendRequest(token, url, params);
    /**
     * { success: true,
         error: '',
         errorCode: 100,
         data:
           [ { uid: 'xxxx',
               phone: 'xxxx',
               status: '1',
               department: 'xxxx',
               contact: '[]',
               orgId: 'xxxx',
               email: '',
               name: 'xxx',
               isHidePhone: '0',
               gender: '1',
               photoUrl: 'xxxxx',
               openId: 'xxxx' } ] }

     */
  }catch (error){
    console.log(error);
  }
}


testFunc();