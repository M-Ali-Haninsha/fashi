function validateform(){
    var email=document.getElementById('valEmail').value
    var emailerror=/^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/gm;
    var error=document.getElementById('error-message')
    
    if(emailerror.test(email)==false)
  {
  error.innerHTML="invalid email"
  return false;
  }

  return true;
}