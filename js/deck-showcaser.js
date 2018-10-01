$(document).ready(function() {
	var btn = $( "#input-card .btn" );
	var input = $( "#input-card #input" );
	var result = $( "#result-card #result-body" );
	input.focus(function() {
		input.select();
		input.removeClass("loaded");
	});

	function loadCards() {
		var txt = input.val().trim();
		var lines = txt.split("\n");

		var requests = {};
		var amount_by_name = {};

		$.each(lines,function(row,line) {
			line = line.trim();
			var re = /^(\d*) (.*?) \((.*?)\) (\d*)$/i;
			var match = line.match(re);

			var amount = match[1];
			var name = match[2];
			var set = match[3];
			//var dunno = match[4]; // just ignore it I guess

			amount_by_name[name] = amount;

			if (typeof requests[set] == "undefined") {
				requests[set] = [[]];
			}

			if (requests[set][0].length >= 50) { // the limit is 100 requests, but we're limiting ourselves to 50 to be safe
				requests[set].unshift([]);
			}

			requests[set][0].push(name);
		});

		result.empty();

		var row = $("<div class='mtg-row'></div>");
		var creatures = $("<div class='mtg-col'><strong>Creatures</strong><div class='mtg-list'></div></div>");
		var noncreatures = $("<div class='mtg-col'><strong>Non-creatures</strong><div class='mtg-list'></div></div>");
		var lands = $("<div class='mtg-col'><strong>Lands</strong><div class='mtg-list'></div></div>");
		var columns = {"creatures":$(".mtg-list",creatures),"noncreatures":$(".mtg-list",noncreatures),"lands":$(".mtg-list",lands)};
		row.append([creatures,noncreatures,lands]);
		result.append(row);

		$("#result-card .collapse").collapse("show");
		input.addClass("loaded");

		var cards = {};
		var num_requests = 0;

		$.each(requests,function(set,arr) {
			$.each(arr,function(idx,names) {
				var request_string = $.param({name:names.join("|"),set:set});
				var url = "https://api.magicthegathering.io/v1/cards?" + request_string;

				var lands = {};

				num_requests++;
				var x = $.get( url, function(data) {
					$.each(data.cards,function(idx,card) {
						var name = card.name;
						var amount = amount_by_name[name] || 0;
						var image = card.imageUrl;
						var type = card.types[0];

						var card_category = "creatures";
						if (type != "Creature") {card_category = "noncreatures";}
						if (type == "Land") {card_category = "lands";}

						if (lands[name] == true) {return;}
						if (card.supertypes && card.supertypes[0] == "Basic" && type == "Land") {
							lands[name] = true;
						}

						var card_url = "http://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=" + card.multiverseid;

						var a = $("<a target='_blank' href='"+card_url+"' class='mtg-card'></a>");
						var img = $("<img src='"+image+"'>");
						img.hide();
						a.append(img);

						if (typeof cards[card_category] == "undefined") {cards[card_category] = [];}
						cards[card_category].push({
							name: name,
							amount: amount,
							image: image,
							a: a,
							cmc: card.cmc
						});
					});
				});

				x.always(function() {
					num_requests--;

					if (num_requests == 0) {
						$.each(cards,function(card_category,_cards) {
							if (card_category == "lands") { // sort lands alphabetically
								_cards.sort(function(a,b) {
									return a.name.localeCompare(b.name);
								});
							} else { // sort other cards by CMC
								_cards.sort(function(a,b) {
									if (a.cmc == b.cmc) {return 0;}
									return a.cmc < b.cmc ? -1 : 1;
								});
							}

							var parent = columns[card_category];
							var num_child = 0;

							$.each(_cards,function(idx,card) {
								var amount = card.amount;

								if (amount > 4) {
									parent.append(card.a);
									card.a.append("<div class='card-counter'>" + amount + "x</div>");
									num_child++;
								} else {
									for(var i=0;i<amount;i++) {
										parent.append(card.a.clone());
										num_child++;
									}
								}
							});
						});

						$("img",result).on("load", function() {
							$(this).show();
							$(".fake-element",$(this).parent()).remove();
						}).each(function() {
							if(this.complete) {
								$(this).show();
							} else {
								var parent = $(this).parent();
								if (parent.is(":first-child")) {
									parent.append("<div class='fake-element' style='display:inline-block; height:300px;'></div>"); // insert fake element
								}
							}
						});
					}
				})
			});
		});
	}

	btn.click(function() {loadCards();});
});