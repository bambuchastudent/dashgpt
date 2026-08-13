# Browser flow regression guide

For flows that only work after a user click, keep the browser action in that same click task. Prepare dependencies before the click, then do remote revalidation after the browser action and before changing remote data.
