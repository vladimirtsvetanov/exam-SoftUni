import '../page-init.js';

const form = document.getElementById('poll-form');

form?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  console.log('Create poll form submitted.');
});
