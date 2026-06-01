/**
 * Initialises an async contact form powered by the Formspree API.
 *
 * Submits via fetch so the page never reloads. Feedback messages are
 * rendered in the active language at the moment the user submits —
 * the form can be in PT or EN depending on the visitor's choice.
 */
function initContactForm(form) {
  const status = form.querySelector('.form-status') || document.getElementById('form-status');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const isPt = document.documentElement.getAttribute('data-lang') !== 'en';
    const data = new FormData(form);

    try {
      const response = await fetch(form.action, {
        method : form.method || 'POST',
        body   : data,
        headers: { 'Accept': 'application/json' },
      });

      if (response.ok) {
        if (status) {
          status.textContent = isPt
            ? 'Pedido enviado com sucesso.'
            : 'Request sent successfully.';
          status.className = 'form-status is-success';
        }
        form.reset();
      } else {
        throw new Error('Server error');
      }
    } catch (_err) {
      if (status) {
        status.textContent = isPt
          ? 'Ocorreu um erro. Por favor tente novamente.'
          : 'An error occurred. Please try again.';
        status.className = 'form-status is-error';
      }
    }
  });
}

// Attach to every contact form that has an endpoint defined in its action attribute
document.querySelectorAll('form.contact-form[action]').forEach(initContactForm);
