$(document).ready(function () {
    var bvpixel = $('.bvdata').data;
    window.bvCallback = function (BV) {
        BV.pixel.trackTransaction(bvpixel);
    };
});
