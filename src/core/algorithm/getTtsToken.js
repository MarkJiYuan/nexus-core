const openai = require("@volcengine/openapi");
const Service = openai.Service
// import { Service } from "@volcengine/openapi";

const appKey = 'VxylhBwyDv'
const accessKeyId = 'AKLTNWU0NWZhZTk2N2NhNGRlMDlmYmE4MzM0ZmU0YTI4MDU'
const secretKey = 'TXpKa016QXhaVGt6TVRRMk5ERTJNV0pqTnpWbE1EWTNNRFU0TlRjMk5USQ=='

const hostname = 'open.volcengineapi.com'
const path = "/";
const action = "GetToken";
const version = "2021-07-27";
const region = "cn-north-1"
const authVersion = "volc-auth-v1";
const serviceName = 'sami'

const expiration = 86400;

const getToken = async () => {
    const options = {
        accessKeyId: accessKeyId,
        secretKey: secretKey,
        // sessionToken:sessionToken,
        region: region,
        host: hostname,
        serviceName: serviceName,
        defaultVersion: version,
    }
    const samiService = new Service(options);
    const bodyObj = {
        token_version: authVersion,
        appkey: appKey,
        expiration,
    }
    const res = await samiService.fetchOpenAPI({
        pathname: path,
        Action: action,
        Version: version,
        method: "POST",
        headers: {
            'content-type': 'application/json',
        },
        data: JSON.stringify(bodyObj)
    })
    if (!res.token) {
        throw new Error(res.msg ?? '获取token失败')
    }
    console.log('token:', res)
    return res.token
}

module.exports = getToken