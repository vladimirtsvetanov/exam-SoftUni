import '../page-init.js';

const form = document.getElementById('edit-poll-form');

form?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  console.log('Edit poll form submitted.');
});
