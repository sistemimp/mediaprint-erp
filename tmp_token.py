import base64, json, hashlib, hmac, time
header = {'alg':'HS256','typ':'JWT'}
payload = {
    'iss':'mediaprint-erp',
    'aud':'mediaprint-client',
    'iat':int(time.time()),
    'nbf':int(time.time()),
    'exp':int(time.time())+3600,
    'sub':1,
    'account_type':'operatore',
    'username':'test',
    'email':'test@example.com',
    'roles':[],
    'permissions':['job.view','job.read']
}
secret = '04fb222b0c3ba451e9f1b7f72f756f33bc7dc5d9db127275ac40080819c114d63dc2f29de59075a285cd753e9454ed53'
def b64(data):
    return base64.urlsafe_b64encode(json.dumps(data,separators=(',',':')).encode()).rstrip(b'=')
hdr = b64(header)
pay = b64(payload)
seg = hdr + b'.' + pay
sig = base64.urlsafe_b64encode(hmac.new(secret.encode(), seg, hashlib.sha256).digest()).rstrip(b'=')
token = seg + b'.' + sig
print(token.decode())
