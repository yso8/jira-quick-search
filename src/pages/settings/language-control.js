async function bindLanguageControl(select, i18n, location) {
  select.value = await i18n.getLanguagePreference();
  select.addEventListener('change', async () => {
    select.disabled = true;
    try {
      await i18n.setLanguagePreference(select.value);
      location.reload();
    } catch (error) {
      select.disabled = false;
      throw error;
    }
  });
}

if (typeof module !== 'undefined' && module.exports) module.exports = { bindLanguageControl };
