from collections import Counter

from apps.links.codec import ALPHABET, generate_code


def test_alphabet_is_url_safe_base62():
    # 0-9, A-Z, a-z - 62 distinct, no padding/symbols that need URL-encoding.
    assert len(ALPHABET) == 62
    assert len(set(ALPHABET)) == 62
    assert set(ALPHABET) <= set(
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnoopqrstuvwxyz"
    )


def test_default_length_is_7():
    assert len(generate_code()) == 7


def test_respects_requested_length():
    assert len(generate_code(10)) == 10


def test_only_uses_alphabet_chars():
    code = generate_code(50)
    assert set(code) <= set(ALPHABET)


def test_codes_are_random_not_constant():
    # Two draws should differ
    assert generate_code() != generate_code()


def test_distribution_is_not_trivially_skewed():
    sample = generate_code(6200)
    most_common_count = Counter(sample).most_common(1)[0][1]
    assert most_common_count < 6200 * 0.10  # no character dominates > 10%
