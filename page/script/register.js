window.addEventListener('load', function() {
    Account.showPassword();
});

async function register() {
    let input = {
        nameLast: document.getElementById('inputNameLast').value.trim(),
        nameMiddle: document.getElementById('inputNameMiddle').value.trim(),
        nameFirst: document.getElementById('inputNameFirst').value.trim(),
        email: document.getElementById('inputEmail').value.trim(),
        emailConfirm: document.getElementById('inputEmailConfirm').value.trim(),
        password: document.getElementById('inputPassword').value.trim(),
    };
    hideDivValidate();
    if (!validateInput(input)) {
        return;
    }
    let sendData = {
        nameLast__param: input.nameLast,
        nameMiddle__param: input.nameMiddle,
        nameFirst__param: input.nameFirst,
        email__param: input.email,
        emailConfirm__param: input.emailConfirm,
        password__param: input.password,
        language: 'vi',
        paramPage: '',
    };
    let registerResult = await Common.sendToBackend('/api/register/user', sendData);
    if (!registerResult.success) {

        if (registerResult.code == 604) {
            document.getElementById('divValidateEmailTaken').style.display = 'block';
            return;
        }
        if (registerResult.code == 606) {
            document.getElementById('divValidateEmailCorrect').style.display = 'block';
            return;
        }
        Common.showMessage(Common.completeString('{{{error_api_general}}}', [registerResult.code]));
        return;
    }
    clearInput();
    document.getElementById('divRegister').style.display = 'none';
    document.getElementById('divWelcome').style.display = 'grid';
};

function hideDivValidate() {
    let divList = document.getElementsByClassName('general-validate');
    for (let i = 0; i < divList.length; i++) {
        divList[i].style.display = 'none';
    }
};

function validateInput(input) {
    let result = true;
    if (input.nameLast == '') {
        document.getElementById('divValidateNameLast').style.display = 'block';
        result = false;
    }
    if (input.nameFirst == '') {
        document.getElementById('divValidateNameFirst').style.display = 'block';
        result = false;
    }
    if (!validateEmail(input)) {
        result = false;
    }
    if (input.emailConfirm == '') {
        document.getElementById('divValidateEmailConfirm').style.display = 'block';
        result = false;
    }
    if (input.password == '') {
        document.getElementById('divValidatePassword').style.display = 'block';
        result = false;
    } else if (!Common.checkPasswordStrength(input.password)) {
        document.getElementById('divValidatePasswordStrong').style.display = 'block';
        result = false;
    }
    return result;
};

function validateEmail(input) {
    let result = true;
    document.getElementById('divValidateEmail').style.display = 'none';
    document.getElementById('divValidateEmailFormat').style.display = 'none';
    document.getElementById('divValidateEmailTaken').style.display = 'none';
    if (input.email == '') {
        document.getElementById('divValidateEmail').style.display = 'block';
        result = false;
    } else if (!Common.validateEmail(input.email)) {
        document.getElementById('divValidateEmailFormat').style.display = 'block';
        result = false;
    }
    return result;
};

async function sendEmailConfirmCode() {
    let input = {
        email: document.getElementById('inputEmail').value.trim(),
    };
    if (!validateEmail(input)) {
        return;
    }
    let sendData = {
        email__param: input.email,
        language: 'vi',
    };
    let result = await Common.sendToBackend('/api/register/user/code/email', sendData);
    if (!result.success) {
        if (result.code == 603) {
            document.getElementById('divValidateEmailTaken').style.display = 'block';
            return;
        }
        Common.showMessage(Common.completeString('{{{error_api_general}}}', [result.code]));
        return;
    }
    Common.showMessage('{{{email_confirm_code_sent}}}');
};

function clearInput() {
    document.getElementById('inputNameLast').value = '';
    document.getElementById('inputNameMiddle').value = '';
    document.getElementById('inputNameFirst').value = '';
    document.getElementById('inputEmail').value = '';
    document.getElementById('inputEmailConfirm').value = '';
    document.getElementById('inputPassword').value = '';
};