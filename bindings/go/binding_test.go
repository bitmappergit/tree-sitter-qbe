package tree_sitter_qbe_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_qbe "github.com/tree-sitter/tree-sitter-qbe/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_qbe.Language())
	if language == nil {
		t.Errorf("Error loading QBE grammar")
	}
}
