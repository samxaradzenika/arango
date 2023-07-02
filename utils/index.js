
function generateOTP(length) {
    const nums = "0123456789";
    let res = "";
    for (let i = 0; i < length; i++) {
      const ind = Math.floor(Math.random() * nums.length);
      res += nums[ind];
    }
    return res;
}

function isSessionExpired(sessionData,maxAge) {
    const currentTime = Date.now();
  
    return maxAge > currentTime - sessionData;
  }
  

module.exports={generateOTP,isSessionExpired}