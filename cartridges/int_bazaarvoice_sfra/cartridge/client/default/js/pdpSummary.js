$(document).ready(function () {
    window.bvCallback = function (BV) {
        if (typeof BV !== 'undefined') {
            BV.reviews.on('show', function () {
                // This line assumes SFRA collapsible panels and is called when clicking on the review summary
                $('.row.reviews:not(.active)').toggleClass('active');
            });
            BV.questions.on('show', function () {
            // This line assumes SFRA collapsible panels and is called when clicking on the Q&A summary
                $('.row.questions:not(.active)').toggleClass('active');
            });
        }
    };
    setTimeout(function () {
        document.getElementById('data-bv-show').classList.remove('bv-hidden');
    }, 1500);


    $('body').on('product:afterAttributeSelect', function (e, response) {
        $('div[data-bv-product-id]').attr('data-bv-product-id', response.data.product.id);
    });
});
