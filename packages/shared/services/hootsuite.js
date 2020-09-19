const puppeteer = require('puppeteer');
const _ = require('lodash')
const moment = require('moment');
module.exports = {
  login: async function () {
    let launchOptions = { headless: false, args: ['--start-maximized'], defaultViewport: { width: 1024, height: 800 } };

    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    await page.goto('https://hootsuite.com/login');
    // console.log("page", page)

    // const email = await page.$('input[name="loginCsrfToken"]');
    // const email = await page.$eval('input[name="loginCsrfToken"]', i => i.getAttribute('value'));

    // console.log("email", email)
    await page.type('#loginEmailInput', 'isai.miles@outree.org');
    await page.type('#loginPasswordInput', 'PXuJt%RuaLYC3bs');
    // await page.type('#loginEmailInput', 'telly.mordche@outree.org');
    // await page.type('#loginPasswordInput', 'a1b2c3d4E%');
    // await page.keyboard.press('Enter');
    await page.evaluate(() => {
      document.querySelector('.submitButton').click();
    });

    await page.waitForNavigation();
    console.log('New Page URL:', page.url());
    if (page.url().indexOf('verify-account') > 0) {
      try {
        const sendConfirmationEmailButton = await page.$eval('#sendConfirmationEmailButton', el => el.textContent.trim())
        console.log("sendConfirmationEmailButton", sendConfirmationEmailButton)
        await page.evaluate(() => {
          document.querySelector('#sendConfirmationEmailButton').click();
        });
      } catch (e) {
        console.log("e 1", e.message)
      }
      try {
        await page.type('#confirmationCodeInput', '757b2138693434af97a06ad6874f015304d1c2a11d189c9c97b11aa4f029410a')
        const form = await page.$('form[name="confirmationEmailForm"]');
        await form.evaluate(form => form.submit());
        await page.waitForNavigation();
        // const submitButton = await page.$eval('button.submitButton', el => el.textContent.trim())
        // console.log("submitButton", submitButton)
        // await page.keyboard.press(submitButton);
        // await page.evaluate(() => {
        //   document.querySelector('button.submitButton').click();
        // });

        // await page.click('.submitButton');

        // await Promise.all([
        //   page.waitForNavigation({ waitUntil: 'networkidle2' }),
        // ]);
        // await page.click('.submitButton', { waitUntil: 'domcontentloaded' });

        await page.screenshot({ path: 'screenshot01.png' });

        // await page.evaluate(() => {
        //   document.querySelector('.submitButton').click();
        // });
        // 
        // const content = await page.content();
        // console.log("content", content);
        // 
        console.log('New Page URL:', page.url());
        // const notificationTitle = await page.$eval('.notificationTitle', el => el.textContent.trim())
        // console.log("notificationTitle", notificationTitle)

      } catch (e) {
        console.log("e 2", e.message)
      }




      // 
    }
    if (page.url().indexOf('dashboard') > 0) {
      // await page.goto('https://hootsuite.com/dashboard#/planner');
      console.log('New Page URL:', page.url());
      // await page.waitForNavigation();
      // 
      const element1 = await Promise.race([
        page.waitFor('div[data-test-id="new-post"]'),
      ]);
      await page.screenshot({ path: 'screenshot02.png' });
      await page.evaluate(() => {
        document.querySelector('div[data-test-id="new-post"]').click();
      });
      // await page.click('div[data-test-id="new-post"]');
      // await page.waitForNavigation();
      // 

      const element2 = await Promise.race([
        page.waitFor('.vk-ComposerHeader'),
      ]);
      await page.screenshot({ path: 'screenshot03.png' });
      // const element3 = await Promise.race([
      //   page.waitFor('.vk-ProfileListItemOuterWrapper'),
      // ]);
      // const tabs = await page.$$eval("#dashboardTabs .tabsWrapper .tab .title", el => el.map())
      const tabs = await page.$$eval("#dashboardTabs .tabsWrapper .tab .title", el => el.map(t => t.textContent.trim()))
      // const tabs = await page.$$("#dashboardTabs .tabsWrapper .tab")      
      const instaTitle = tabs.map(t => {
        if (t.indexOf('nsta') > 0) {
          return t.split('(')[0].trim();
        } else {
          return undefined;
        }
      }).filter(item => !_.isUndefined(item));
      const current = instaTitle[0];
      console.log("current", current)


      await page.click('.vk-PillsInputWrapper > input');
      await page.screenshot({ path: 'screenshot04.png' });

      // this one selects the profile.
      await page.click(`div[title="${current}"]`);
      await page.screenshot({ path: 'screenshot05.png' });

      await page.click(`.vk-PostToWrapper`);
      await page.screenshot({ path: 'screenshot06.png' });

      await page.click(`.vk-MessageTextArea`);
      await page.screenshot({ path: 'screenshot07.png' });

      // this is for content
      await page.type(`.vk-MessageTextArea`, 'abc');
      await page.screenshot({ path: 'screenshot08.png' });

      await page.click(`.vk-PostToWrapper`);
      await page.screenshot({ path: 'screenshot09.png' });

      // this one is for schedule for later. 
      await page.click(`.vk-SchedulerSelector > button`);
      await page.screenshot({ path: 'screenshot10.png' });

      await page.click(`div[aria-label="${moment().add(1, 'day').format('ddd MMM DD YYYY')}"]`)
      await page.screenshot({ path: 'screenshot11.png' });

      await page.click(`.vk-PostToWrapper`);
      await page.screenshot({ path: 'screenshot12.png' });

      await page.waitForSelector('input[type=file]');
      await page.waitFor(1000);

      // get the ElementHandle of the selector above
      const inputUploadHandle = await page.$('input[type=file]');
      let fileToUpload = 'screenshot02.png';
      // https://images.pexels.com/photos/3361704/pexels-photo-3361704.jpeg?auto=compress&cs=tinysrgb&h=750&w=1260
      // Sets the value of the file input to fileToUpload
      inputUploadHandle.uploadFile(fileToUpload);
      await page.waitForSelector('.vk-ImagePreviewThumbnail');
      await page.waitFor(5000);
      await page.screenshot({ path: 'screenshot14.png' });


      await page.click(`button.vk-EditFooterScheduleButton`);
      await page.screenshot({ path: 'screenshot15.png' });
      // await page.evaluate(() => {
      //   document.querySelector('button.vk-CloseButton').click();
      // });


      // const content = await page.content();
      // console.log("content", content);
      // await page.evaluate(() => {
      //   document.querySelector('button[data-tracking-origin="web.dashboard.header.compose_button"]').click();
      // });
      // page.click('.vk-NewPostButton]'),


      // await page.waitForNavigation();
      // const [response] = await Promise.all([
      //   // page.click(''), 
      // ]);


      // ----------------------- sign out code --------------

      await page.evaluate(() => {
        document.querySelector('button[data-tracking-origin="web.dashboard.account_navigation"]').click();
      });
      await page.screenshot({ path: 'screenshot16.png' });
      const [response] = await Promise.all([
        page.waitForNavigation(),
        page.click('div[data-test-id="Sign out"]'),
      ]);
      await page.screenshot({ path: 'screenshot17.png' });
      console.log('sign out')
    }
    await browser.close();

  }
}