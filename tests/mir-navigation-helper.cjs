'use strict';
// Follow the real shared menu, including visibility and focus, without bypassing it.
async function openMirTab(page,key){
 const button=page.locator('#mir-procurement-tabs [data-mir-tab="'+key+'"]');
 if(!await button.isVisible())await page.locator('.mir-harmony-toggle').click();
 await button.click();
}
module.exports={openMirTab};
