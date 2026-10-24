// Real-money gold packs. One list feeds both the shop (prices on the cards)
// and the payment API (what Stripe charges, and how much gold a paid session
// grants), so the two can't disagree. Amounts are in the currency's minor unit.
(function (root) {
  var STORE = {
    currency: "usd",
    packs: [
      { id: "buygold_1", gold: 200, amount: 499 },
      { id: "buygold_2", gold: 500, amount: 899 },
      { id: "buygold_3", gold: 1000, amount: 1599 },
      { id: "buygold_4", gold: 2000, amount: 2399 },
      { id: "buygold_5", gold: 5000, amount: 4799 },
      { id: "buygold_6", gold: 10000, amount: 7999 },
    ],
  };
  if (typeof module !== "undefined" && module.exports) module.exports = STORE;
  else root.OOR_PACKS = STORE;
})(this);
