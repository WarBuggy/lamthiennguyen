class Account {
    static showPassword() {
        let inputCheck = document.getElementById('inputCheckShowPassword');
        if (inputCheck == null) {
            return;
        }
        let checked = document.getElementById('inputCheckShowPassword').checked;
        let inputPasswordRegister = document.getElementById('inputPassword');
        let currentValue = inputPasswordRegister.value;
        if (checked) {
            inputPasswordRegister.type = 'text';
        } else {
            inputPasswordRegister.type = 'password';
        }
        inputPasswordRegister.value = currentValue;
    };
};