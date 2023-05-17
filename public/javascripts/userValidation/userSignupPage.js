function validateform(){
    var email=document.getElementById('valEmail').value
    const name=document.getElementById("name")
const phone=document.getElementById("phone")
const password=document.getElementById("password")
const repeatpass=document.getElementById("repeatpass")
const nameerror=document.getElementById("nameerror")
const phoneerror=document.getElementById("phoneerror")
const passworderror=document.getElementById("passworderror")
const repeatpasserror=document.getElementById("repeatpasserror")
    var emailerror=/^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/gm;
    var error=document.getElementById('error-message')
    
    if(emailerror.test(email)==false)
  {
  error.innerHTML="invalid email"
  return false;
  }else  if(name.value.trim()==="" || name.value.trim()===null){
    nameerror.innerHTML="name required"
    return false
}    else if(phone.value.trim()==="" || isNaN(phone.value)){
        
  phoneerror.innerHTML="phone number required"
  return false
}  else if(phone.value.length<10){
  phoneerror.innerHTML="required 10 digit number"
  return false
}    else if(password.value===""|| password.value===null){
  passworderror.innerHTML="password required"
  return false
}   else if(repeatpass.value!==password.value){
  repeatpasserror.innerHTML="passwords are not the same"
  return false
}

  return true;
}


