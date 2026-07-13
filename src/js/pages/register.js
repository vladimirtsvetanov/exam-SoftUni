import '../page-init.js';

const form = document.getElementById('register-form');

form?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  console.log('Register form submitted.');
});
