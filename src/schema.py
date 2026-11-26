FIELDS = ["id", "name_en", "name_ru", "base_spirit", "ingredients", "method", "glass", "ice",
          "garnish", "instructions", "flavor_tags", "strength", "family", "iba_category",
          "occasion_tags", "extra_tags", "origin", "year", "creator", "description"]


def C(*args):
    assert len(args) == len(FIELDS), (args[0], len(args))
    return dict(zip(FIELDS, args))
