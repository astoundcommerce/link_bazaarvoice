'use strict';

/**
 * Resolves a BV display namespace, preferring v2 (`swat_*`) and falling back to legacy v1.
 *
 * @param {Object} BV - The global Bazaarvoice API object.
 * @param {string} name - Base namespace name (e.g. `reviews`, `questions`).
 * @returns {Object|null} The matching namespace exposing an `on` method, or `null` if none found.
 */
function getBvNamespace(BV, name) {
    /**
     * @param {string} key - Property key to look up on the BV object.
     * @returns {Object|null} The namespace if it exposes an `on` method, otherwise null.
     */
    function pick(key) {
        var namespace = BV && BV[key];
        return (namespace && typeof namespace.on === 'function') ? namespace : null;
    }

    return pick('swat_' + name) || pick(name);
}

$(document).ready(function () {
    window.bvCallback = function (BV) {
        var reviewsNs = getBvNamespace(BV, 'reviews');
        var questionsNs = getBvNamespace(BV, 'questions');

        if (reviewsNs) {
            reviewsNs.on('show', function () {
                // This line assumes SFRA collapsible panels and is called when clicking on the review summary
                $('.row.reviews:not(.active)').toggleClass('active');
            });
        }

        if (questionsNs) {
            questionsNs.on('show', function () {
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
