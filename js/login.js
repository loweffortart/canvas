function login_failure(){

  $('#username').val('')
  $('#password').val('')

  let modal = $('#login-modal')
  modal.find('#login-wait').addClass('hidden')
  modal.find('#login-input').removeClass('hidden')
}

function login_success(username){

  function changeHandler(items){
    let uid = items[0].item.uid
    $('#user-button').text(username.toLowerCase())
    $('#user-button').attr({'uid': uid})
    $('#login-modal').modal('hide')
    console.log(username, uid)
  }
  userbase.openDatabase({ databaseName: 'uids', changeHandler })

}

function login(){
  let username = $('#username').val()
  let password = $('#password').val()

  let modal = $('#login-modal')
  modal.find('#login-wait').removeClass('hidden')
  modal.find('#login-input').addClass('hidden')
  
  userbase.signIn({ username, password, rememberMe: 'local' })
  .then(() => login_success(username))
  .catch((e) => login_failure())
}

function logout(){

  let modal = $('#login-modal')
  userbase.signOut()
  .then(function(){
    modal.modal('show')
    modal.find('#login-wait').addClass('hidden')
    modal.find('#login-input').removeClass('hidden')
  })
}

function init_login_handler(){
  let modal = $('#login-modal')
  modal.modal('show')
  modal.find('#login-wait').removeClass('hidden')
  modal.find('#login-input').addClass('hidden')

  userbase.init({'appId': '2b181ad1-b1a1-4f8b-8b86-e7f1414371e6'})
  .then((session) => session.user ? login_success(session.user.username) : login_failure())

}